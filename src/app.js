import http from 'http';
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import passport from 'passport';
import multer from 'multer';
import { Strategy } from 'passport-facebook';

import './db';

import config from '../config.json';
import {
    readPaper,
    writePaper,
    checkIfUserWriteOnPaper,
    putTextOnPaper,
    getPapersWhichCreatorWrite
} from './db/paper';

// serialize
// 인증후 사용자 정보를 세션에 저장
passport.serializeUser((user, done) => {
    console.log('serialize');
    done(null, user);
});

// deserialize
// 인증후, 사용자 정보를 세션에서 읽어서 request.user에 저장
passport.deserializeUser((user, done) => {
    //findById(id, function (err, user) {
    console.log('deserialize');
    done(null, user);
    //});
});

passport.use(new Strategy(
    {
        clientID: config.auth.facebook.clientId,
        clientSecret: config.auth.facebook.secret,
        callbackURL: `${config.url}/auth/facebook/callback`
    },
    (accessToken, refreshToken, profile, done) => {
        console.log(profile);
        done(null, profile);
    }
));


function ensureAuthenticated(req, res, next) {
    // 로그인이 되어 있으면, 다음 파이프라인으로 진행
    if (req.isAuthenticated()) { return next(); }
    // 로그인이 안되어 있으면, login 페이지로 진행
    req.session.nextUrl = req.originalUrl || '/paper';
    return res.redirect('/login');
}


const app = express();
const profileUpload = multer({
    dest: `${__dirname}/../public/profile`
});
const audioUpload = multer({
    dest: `${__dirname}/../public/audio`
});

app.set('port', config.port);
app.set('views', `${__dirname}/../public/views`);
app.set('view engine', 'ejs');
app.use(express.static(`${__dirname}/../public`));
app.use(session({ secret: config.key }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    if (req.user) {
        req.session.nextUrl = `/user/${req.user.id}`;
        res.redirect(`/user/${req.user.id}`);
    } else {
        res.render('index');
    }
});
app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successRedirect: '/login_success',
        failureRedirect: '/login_fail'
    })
);

app.get('/login_success', (req, res) => {
    res.redirect(req.session.nextUrl || `/user/${req.user.id}`);
});

app.get('/user/:userId', ensureAuthenticated, async (req, res) => {
    try {
        const papers = await getPapersWhichCreatorWrite(req.params.userId);

        res.render('my_page', {
            userId: req.user.id,
            userName: req.user.displayName,
            myPapers: papers.map(paper => {
                const date = new Date(paper.birthday);

                return {
                    profilePath: paper.profilePath,
                    url: `/paper/${paper._id}`,
                    title: paper.words,
                    birthday: `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
                };
            })
        });
    } catch (err) {
        res.status(500);
        res.json({ error: err });
    }
});

app.get('/add-paper', ensureAuthenticated, (req, res) => {
    res.render('add_paper', {
        userId: req.user.id
    });
});

app.get('/paper/:paperId', ensureAuthenticated, async (req, res) => {
    try {
        const paperId = req.params.paperId;
        const userId = req.user.id;
        let view;

        const paper = await readPaper(paperId);
        const birthday = new Date(paper.birthday);
        const day = `${birthday.getFullYear()}년 ${birthday.getMonth() + 1}월 ${birthday.getDate()}일`;

        const sure = await checkIfUserWriteOnPaper(paperId, userId);

        if (sure) view = 'paper_show';
        else view = 'paper_edit';

        res.render(view, {
            userId,
            targetUserName: paper.targetUser.name,
            profilePath: paper.profilePath,
            texts: paper.texts,
            birthday: day,
            words: paper.words,
            shareUrl: `${config.url}/paper/${paperId}`
        });
    } catch (err) {
        res.status(500);
        res.json({ error: err });
    }
});

app.get('/login_fail', (req, res) => {
    res.redirect('/login');
});
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.post(
    '/api/paper',
    profileUpload.any(),
    (req, res) => {
        const thisYear = (new Date()).getFullYear();

        const creator = req.user.id;
        const profilePath = `/profile/${req.files[0].filename}`;
        const targetUser = {
            name: req.body.name,
            email: req.body.email
        };
        const words = req.body.words;
        const targetUserBirthday = new Date(req.body.date);
        const date = `${thisYear}/
        ${targetUserBirthday.getMonth() + 1}/
        ${targetUserBirthday.getDate()}`;

        const birthday = new Date(date);

        writePaper(
            creator,
            targetUser,
            birthday,
            words,
            profilePath
        ).then(paper => {
            res.json({
                url: `/paper/${paper._id}`
            });
        }).catch(err => {
            res.status(500);
            res.json({ error: err });
        });
    }
);

app.post(
    '/api/paper/:paperId',
    ensureAuthenticated,
    audioUpload.any(),
    (req, res) => {
        const paperId = req.params.paperId;
        const userName = req.body.userName || req.user.displayName;
        const text = req.body.text;
        const userId = req.user.id;

        let audioPath;

        if (req.files[0]) {
            audioPath = `audio/${req.files[0].filename}`;
        }

        putTextOnPaper(
            paperId,
            userId,
            userName,
            text,
            audioPath
        ).then(() => {
            res.json({ result: 'success' });
        }).catch(err => {
            res.status(500);
            res.json({ error: err });
        });
    }
);

http.createServer(app).listen(app.get('port'), () => {
    console.log(`Express server listening on port ${app.get('port')}`);
});
