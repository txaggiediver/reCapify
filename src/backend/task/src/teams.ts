// src/backend/task/src/teams.ts
import { Page } from "playwright";
import { transcriptionService } from "./scribe.js";
import { details } from "./details.js";

export default class Teams {
    private async sendMessages(page: Page, messages: string[]): Promise<void> {
        const messageElement = await page.waitForSelector(
            'div[role="textbox"][aria-label*="message"]'
        );
        for (const message of messages) {
            await messageElement?.fill(message);
            await messageElement?.press("Enter");
        }
    }

    private prevSender: string = "";

    public async initialize(page: Page): Promise<void> {
        console.log("Getting meeting link.");
        await page.goto(details.invite.meetingLink);

        console.log("Entering name.");
        try {
            const nameTextElement = await page.waitForSelector('input[placeholder="Enter name"]');
            if (nameTextElement) {
                await nameTextElement.type(details.scribeIdentity);
                await nameTextElement.press("Enter");
            }
        } catch {
            console.log("Your scribe was unable to join the meeting.");
            return;
        }

        console.log("Clicking join options.");
        const joinOptionsElement = await page.waitForSelector('button[aria-label="Join options"]');
        await joinOptionsElement?.click();

        console.log("Clicking mute button.");
        const muteButtonElement = await page.waitForSelector('button[aria-label="Mute microphone"]');
        await muteButtonElement?.click();

        console.log("Clicking video button.");
        const videoButtonElement = await page.waitForSelector('button[aria-label="Turn camera off"]');
        await videoButtonElement?.click();

        console.log("Clicking join button.");
        const joinButtonElement = await page.waitForSelector('button[aria-label="Join meeting"]');
        await joinButtonElement?.click();

        console.log("Opening chat panel.");
        try {
            const chatPanelElement = await page.waitForSelector(
                'button[aria-label="Show conversation"]',
                { timeout: details.waitingTimeout }
            );
            await chatPanelElement?.click();
        } catch {
            console.log("Your scribe was not admitted into the meeting.");
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));

        details.updateInvite("Joined");
        console.log("Sending introduction messages.");
        await this.sendMessages(page, details.introMessages);

        // Add speaker detection
        await page.exposeFunction("speakerChange", transcriptionService.speakerChange);
        console.log("Listening for speaker changes.");
        await page.evaluate(() => {
            const targetNode = document.querySelector('[data-tid="active-speaker-name"]');
            if (targetNode) {
                const config = { characterData: true, subtree: true };
                const callback = (mutationList: MutationRecord[]) => {
                    for (const mutation of mutationList) {
                        const newSpeaker = mutation.target.textContent;
                        if (newSpeaker && newSpeaker !== "No one") {
                            (window as any).speakerChange(newSpeaker);
                        }
                    }
                };
                const observer = new MutationObserver(callback);
                observer.observe(targetNode, config);
            }
        });

        // Add chat message detection
        await page.exposeFunction("messageChange", async (sender: string, text: string) => {
            if (text === details.endCommand) {
                console.log("Your scribe has been removed from the meeting.");
                await page.goto("about:blank");
            } else if (details.start && text === details.pauseCommand) {
                details.start = false;
                console.log(details.pauseMessages[0]);
                await this.sendMessages(page, details.pauseMessages);
            } else if (!details.start && text === details.startCommand) {
                details.start = true;
                console.log(details.startMessages[0]);
                await this.sendMessages(page, details.startMessages);
            } else if (
                details.start &&
                !sender.includes(details.scribeName)
            ) {
                const timestamp = new Date().toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                });
                const message = `[${timestamp}] ${sender}: ${text}`;
                details.messages.push(message);
            }
        });

        console.log("Listening for message changes.");
        await page.evaluate(() => {
            const targetNode = document.querySelector('.ts-message-list');
            const config = { childList: true, subtree: true };

            const callback = (mutationList: MutationRecord[]) => {
                for (const mutation of mutationList) {
                    const addedNode = mutation.addedNodes[0] as Element;
                    if (addedNode) {
                        const sender = addedNode.querySelector('.message-author')?.textContent;
                        const text = addedNode.querySelector('.message-body')?.textContent;
                        if (sender && text) {
                            (window as any).messageChange(sender, text);
                        }
                    }
                }
            };

            const observer = new MutationObserver(callback);
            if (targetNode) observer.observe(targetNode, config);
        });

        console.log("Waiting for meeting end.");
        try {
            await page.waitForSelector('[aria-label="Leave the call"]', {
                state: "attached",
                timeout: details.meetingTimeout,
            });
            console.log("Meeting ended.");
        } catch (error) {
            console.log("Meeting timed out.");
        } finally {
            details.start = false;
        }
    }
}

