import { Paper } from './models/paper';

function savePaper(paper) {
    return new Promise((resolve, reject) => {
        paper.save((err, savedPaper) => {
            if (err) reject(err);
            else resolve(savedPaper);
        });
    });
}

function getPaper(paperId) {
    return new Promise((resolve, reject) => {
        Paper.findOne(
            { _id: paperId },
            (err, paper) => {
                if (err) {
                    reject(['error', err]);
                } else if (!paper) {
                    reject(['not_found', err]);
                } else {
                    resolve(paper);
                }
            }
        );
    });
}

function getPapers(query) {
    return new Promise((resolve, reject) => {
        Paper.find(
            query,
            (err, papers) => {
                if (err) {
                    reject(['error', err]);
                } else if (!papers) {
                    reject(['not_found', err]);
                } else {
                    resolve(papers);
                }
            }
        );
    });
}

export async function readPaper(paperId) {
    try {
        const paper = await getPaper(paperId);

        return Promise.resolve(paper);
    } catch (err) {
        return Promise.reject(err);
    }
}

export async function writePaper(creator, targetUser, birthday, words, profilePath) {
    try {
        const paper = new Paper({
            creator,
            targetUser,
            birthday,
            words,
            profilePath
        });

        const savedPaper = await savePaper(paper);

        return Promise.resolve(savedPaper);
    } catch (err) {
        return Promise.reject(err);
    }
}

export async function checkIfUserWriteOnPaper(paperId, userId) {
    try {
        const paper = await getPaper(paperId);
        let sure = false;

        if (paper.texts === undefined) {
            return Promise.resolve(false);
        }

        paper.texts.forEach((text) => {
            if (text.id === userId) {
                sure = true;
            }
        });

        return Promise.resolve(sure);
    } catch (err) {
        return Promise.reject(err);
    }
}

export async function putTextOnPaper(paperId, id, username, text, audioPath = null) {
    try {
        const paper = await getPaper(paperId);

        if (paper.texts === undefined) {
            paper.texts = [];
        }

        paper.texts.push({
            id,
            username,
            text,
            audio: audioPath ? audioPath : ''
        });

        await savePaper(paper);

        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

export async function getPapersWhichCreatorWrite(userId) {
    try {
        const papers = await getPapers({ creator: userId });
        return Promise.resolve(papers);
    } catch (err) {
        return Promise.reject(err);
    }
}
