// const fs = require("fs");
// const readline = require("readline");
// const { google } = require("googleapis");
// const nodemailer = require("nodemailer");

// const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];
// const TOKEN_PATH = "token.json";
// const LABEL_NAME = "VacationAutoReply";

// // Load client secrets from a file and set up the Gmail API
// fs.readFile("credentials.json", (err, content) => {
//   if (err) return console.log("Error loading client secret file:", err);
//   var data = JSON.parse(content);
//   console.log(data.web.client_secret);
//   authorize(JSON.parse(content), checkEmails);
// });

// // Create an OAuth2 client with the given credentials
// function authorize(credentials, callback) {
//   const { client_secret, client_id } = credentials.web;
//   const oAuth2Client = new google.auth.OAuth2(
//     client_id,
//     client_secret,
//     "https://developers.google.com/oauthplayground"
//   );

//   fs.readFile(TOKEN_PATH, (err, token) => {
//     if (err) return getAccessToken(oAuth2Client, callback);
//     oAuth2Client.setCredentials(JSON.parse(token));
//     callback(oAuth2Client);
//   });
// }

// // Get and store new token after prompting for user authorization
// function getAccessToken(oAuth2Client, callback) {
//   const authUrl = oAuth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: SCOPES,
//   });
//   console.log("Authorize this app by visiting this url:", authUrl);
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });
//   rl.question("Enter the code from that page here: ", (code) => {
//     rl.close();
//     oAuth2Client.getToken(code, (err, token) => {
//       if (err) return console.error("Error retrieving access token", err);
//       oAuth2Client.setCredentials(token);
//       // Store the token to disk for later program executions
//       fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
//         if (err) return console.error(err);
//         console.log("Token stored to", TOKEN_PATH);
//       });
//       callback(oAuth2Client);
//     });
//   });
// }

// // Check for new emails and send auto-replies
// async function checkEmails(auth) {
//   const gmail = google.gmail({ version: "v1", auth });

//   // Get the list of messages in the inbox
//   const {
//     data: { messages },
//   } = await gmail.users.messages.list({
//     userId: "me",
//     labelIds: ["INBOX"],
//   });

//   // Iterate through each message
//   for (const message of messages) {
//     const messageId = message.id;

//     // Check if the message has a label indicating a reply
//     // const hasReplyLabel = message.labelIds.includes(LABEL_NAME);
//     const hasReplyLabel =
//       message.labelIds &&
//       Array.isArray(message.labelIds) &&
//       message.labelIds.includes(LABEL_NAME);

//     if (!hasReplyLabel) {
//       // Get the thread ID of the message
//       const {
//         data: { threadId },
//       } = await gmail.users.messages.get({
//         userId: "me",
//         id: messageId,
//       });

//       // Check if the thread has any prior replies sent by you
//       const {
//         data: { messages: threadMessages },
//       } = await gmail.users.threads.get({
//         userId: "me",
//         id: threadId,
//       });

//       const hasPriorReplies = threadMessages.some((threadMessage) => {
//         return threadMessage.labelIds.includes(LABEL_NAME);
//       });

//       if (!hasPriorReplies) {
//         // Send auto-reply
//         const autoReply =
//           "Thank you for your email. I am currently out of the office and will respond to your inquiry as soon as possible.";
//         await gmail.users.messages.send({
//           userId: "me",
//           requestBody: {
//             raw: Buffer.from(
//               `From: doctocare7@gmail.com\r\nTo: ${
//                 message.payload.headers.find((header) => header.name === "From")
//                   .value || "Unknown"
//               }\r\nSubject: Re: ${
//                 message.payload.headers.find((header) => header.name === "From")
//                   .value || "Unknown"
//               }\r\n\r\n${autoReply}`
//             ).toString("base64"),
//           },
//         });

//         // Add label to the email
//         await gmail.users.messages.modify({
//           userId: "me",
//           id: messageId,
//           requestBody: {
//             addLabelIds: [LABEL_NAME],
//           },
//         });

//         console.log(`Auto-reply sent to ${message.labelIds[0]}`);
//       }
//     }
//   }
// }

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const express = require('express');
const app = express();
const port = 3003;

// If modifying these scopes, delete token.json.
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send'
];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/*Load or request or authorization to call APIs.*/
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
*/


//index.js

/* List the labels */
async function listLabels(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.labels.list({
        userId: 'me',
    });
    const labels = res.data.labels;
    if (!labels || labels.length === 0) {
        console.log('No labels found.');
        return;
    }
    console.log('Labels:');
    labels.forEach((label) => {
        console.log(`- ${label.name}:${label.id}`);
    });
}
authorize().then(listLabels).catch(console.error);

app.get("/", async (req, res) => {

    // Get Unreplied messages
    async function getUnrepliedMessages(auth) {
        const gmail = google.gmail({ version: 'v1', auth });
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: '-in:chat -from:me -has:userlabels'
        });
        return res.data.messages || [];
    }

    // Send Replies
    async function sendReply(auth, message) {
        const gmail = google.gmail({ version: 'v1', auth });
        const res = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From'],
        });

        const subject = res.data.payload.headers.find((header) => header.name == 'Subject').value;
        const from = res.data.payload.headers.find((header) => header.name == 'From').value;

        const replyTo = from.match(/<(.*)>/)[1];
        const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
        const replyBody = `Dear, \n\n we have received your mail and will reply soon. \n\n Regards,\n Balaji`

        const rawMessage = [
            `From: me`,
            `To: ${replyTo}`,
            `Subject: ${replySubject}`,
            `In-Reply-To: ${message.id}`,
            `References: ${message.id}`,
            ``,
            replyBody
        ].join('\n');

        const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '-').replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });
    }

    /* Create label */
    const LABEL_NAME = 'PENDING';
    async function createLabel(auth) {
        const gmail = google.gmail({ version: 'v1', auth });
        try {
            const res = await gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name: LABEL_NAME,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show'
                }
            })
            return res.data.id;
        } catch (err) {
            if (err.code === 409) {
                //label already exist
                const res = await gmail.users.labels.list({
                    userId: 'me'
                })
                const label = res.data.labels.find((label) => label.name === LABEL_NAME);
                return label.id;
            } else {
                throw err;
            }
        }
    }

    /* Add label to the message and move it ot the label folder */
    async function addLabel(auth, message, labelId) {
        const gmail = google.gmail({ version: 'v1', auth });
        await gmail.users.messages.modify({
            id: message.id,
            userId: 'me',
            requestBody: {
                addLabelIds: [labelId],
                removeLabelIds: ['INBOX'],
            },
        });
    }

    async function main() {
        const auth = await authorize()
        const labelId = await createLabel(auth);
        console.log(`LABEL ID: ${labelId}`)
        setInterval(async () => {
            const messages = await getUnrepliedMessages(auth);
            console.log(`UNREPLIED MESSAGES: ${messages.length}`);
            for (let message of messages) {
                await sendReply(auth, message);
                console.log(`REPLIED TO: ${message.id}`)
                await addLabel(auth, message, labelId)
                console.log(`ADDED LABEL TO: ${message.id}`)
            }
        }, Math.floor(Math.random() * (10 - 5 + 1) + 5) * 1000);
    }

    main().catch(console.error);
    res.send("Success !!!!");
})

app.listen(port, () => {
    console.log(`Listening at: http://localhost:${port}`);
})