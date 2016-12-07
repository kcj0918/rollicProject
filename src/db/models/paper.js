import mongoose from 'mongoose';
const Scheme = mongoose.Schema;

const paperScheme = new Scheme({
    targetUser: {
        name: { type: String },
        email: { type: String }
    },
    creator: { type: String },
    texts: [
        {
            id: { type: String },
            username: { type: String },
            text: { type: String },
            audio: { type: String, default: 'none' }
        }
    ],
    birthday: {
        type: Date
    },
    words: { type: String },
    profilePath: { type: String }
});

export const Paper = mongoose.model('paper', paperScheme);
