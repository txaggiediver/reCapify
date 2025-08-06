import { details } from "./details.js";
import { transcriptionService } from "./scribe.js";
import { chromium, Browser, Page } from "playwright";
import Chime from "./chime.js";
import Teams from "./teams.js";
import Webex from "./webex.js";
import { encapsulate } from "./process.js";

const main = async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timestampDiff = Math.max(
        0,
        (details.invite.meetingTime - currentTimestamp - 10) * 1000
    );
    console.log(`Sleeping ${timestampDiff / 1000} seconds.`);
    await new Promise((resolve) => setTimeout(resolve, timestampDiff));

    transcriptionService.startTranscription();

    const browser: Browser = await chromium.launch({
        // headless: false,
        ignoreDefaultArgs: ["--mute-audio"],
        args: [
            "--window-size=1920,1080",
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--disable-notifications",
            "--disable-extensions",
            "--disable-crash-reporter",
            "--disable-dev-shm-usage",
            "--no-sandbox",
        ],
    });
    const page: Page = await browser.newPage();
    page.setDefaultTimeout(20000);

let meeting: any;
if (details.invite.meetingPlatform === "Chime") {
    meeting = new Chime();
} else if (details.invite.meetingPlatform === "Webex") {
    meeting = new Webex();
} else if (details.invite.meetingPlatform === "Teams") {
    meeting = new Teams();
}

    await meeting.initialize(page);

    await browser.close();
    transcriptionService.stopTranscription();

    await encapsulate();
    await details.updateInvite("Completed");
    await details.deleteInvite();
    return;
};

main();
