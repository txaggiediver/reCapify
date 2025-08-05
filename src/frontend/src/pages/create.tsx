import {
    Alert,
    AppLayout,
    Button,
    Checkbox,
    ContentLayout,
    DatePicker,
    Form,
    FormField,
    Header,
    HelpPanel,
    Input,
    Select,
    SpaceBetween,
    TimeInput,
} from "@cloudscape-design/components";
import { generateClient } from "aws-amplify/api";
import { useContext, useState } from "react";
import { CreateInviteInput } from "../API";
import { NotificationContext } from "../components/notifications";
import { meetingPlatforms } from "../platform";
import * as mutations from "../graphql/mutations";

const client = generateClient();

export default function Create() {
    const [name, setName] = useState("");
    const [platform, setPlatform] = useState("Chime");
    const [meetingUrl, setMeetingUrl] = useState("");
    const [meetingPassword, setMeetingPassword] = useState("");
    const [showMeetingPassword, setShowMeetingPassword] = useState(false);
    const [meetingDate, setMeetingDate] = useState<string | null>(null);
    const [meetingTime, setMeetingTime] = useState<string | null>(null);
    const [showDateTime, setShowDateTime] = useState(false);
    const [error, setError] = useState("");
    const { addNotification } = useContext(NotificationContext);

    const validatePlatform = (platform: string, url: string) => {
        switch (platform) {
            case "Teams":
                return url.includes("teams.microsoft.com/l/meetup-join");
            case "Chime":
                return url.includes("chime.aws");
            case "Webex":
                return url.includes("webex.com");
            default:
                return false;
        }
    };

    const handleSubmit = async (event: any) => {
        event.preventDefault();

        if (!name) {
            setError("Name is required");
            return;
        }

        if (!meetingUrl) {
            setError("Meeting URL is required");
            return;
        }

        if (!validatePlatform(platform, meetingUrl)) {
            setError(`Invalid meeting URL for ${platform}`);
            return;
        }

        const input: CreateInviteInput = {
            name,
            platform,
            meetingURL: meetingUrl,
        };

        if (showMeetingPassword && meetingPassword) {
            input.meetingPassword = meetingPassword;
        }

        if (showDateTime && meetingDate && meetingTime) {
            const [hours, minutes] = meetingTime.split(":");
            const date = new Date(meetingDate);
            date.setHours(parseInt(hours));
            date.setMinutes(parseInt(minutes));
            input.meetingTime = date.toISOString();
        }

        try {
            await client.graphql({
                query: mutations.createInvite,
                variables: { input },
            });

            addNotification({
                type: "success",
                content: "Successfully created invite",
                dismissible: true,
                onDismiss: () => {},
            });

            setName("");
            setPlatform("Chime");
            setMeetingUrl("");
            setMeetingPassword("");
            setShowMeetingPassword(false);
            setMeetingDate(null);
            setMeetingTime(null);
            setShowDateTime(false);
            setError("");
        } catch (error) {
            console.error(error);
            setError("Error creating invite");
        }
    };

    const handleSchedule = async (event: any) => {
        event.preventDefault();

        if (!name) {
            setError("Name is required");
            return;
        }

        if (!meetingUrl) {
            setError("Meeting URL is required");
            return;
        }

        if (!validatePlatform(platform, meetingUrl)) {
            setError(`Invalid meeting URL for ${platform}`);
            return;
        }

        if (!meetingDate) {
            setError("Meeting date is required");
            return;
        }

        if (!meetingTime) {
            setError("Meeting time is required");
            return;
        }

        const input: CreateInviteInput = {
            name,
            platform,
            meetingURL: meetingUrl,
        };

        if (showMeetingPassword && meetingPassword) {
            input.meetingPassword = meetingPassword;
        }

        const [hours, minutes] = meetingTime.split(":");
        const date = new Date(meetingDate);
        date.setHours(parseInt(hours));
        date.setMinutes(parseInt(minutes));
        input.meetingTime = date.toISOString();

        try {
            await client.graphql({
                query: mutations.createInvite,
                variables: { input },
            });

            addNotification({
                type: "success",
                content: "Successfully scheduled invite",
                dismissible: true,
                onDismiss: () => {},
            });

            setName("");
            setPlatform("Chime");
            setMeetingUrl("");
            setMeetingPassword("");
            setShowMeetingPassword(false);
            setMeetingDate(null);
            setMeetingTime(null);
            setShowDateTime(false);
            setError("");
        } catch (error) {
            console.error(error);
            setError("Error scheduling invite");
        }
    };

    return (
        <AppLayout
            content={
                <ContentLayout
                    header={
                        <Header
                            variant="h1"
                            description="Invite a scribe to your meeting"
                        >
                            Create Invite
                        </Header>
                    }
                >
                    <Form
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button
                                    formAction="submit"
                                    variant="primary"
                                    onClick={handleSubmit}
                                >
                                    Invite Now
                                </Button>
                                {showDateTime && (
                                    <Button
                                        formAction="submit"
                                        variant="primary"
                                        onClick={handleSchedule}
                                    >
                                        Invite Later
                                    </Button>
                                )}
                            </SpaceBetween>
                        }
                    >
                        <SpaceBetween direction="vertical" size="l">
                            <FormField label="Name">
                                <Input
                                    value={name}
                                    onChange={({ detail }) =>
                                        setName(detail.value)
                                    }
                                />
                            </FormField>
                            <FormField label="Platform">
                                <Select
                                    selectedOption={
                                        meetingPlatforms.find(
                                            (p) => p.value === platform
                                        ) || null
                                    }
                                    onChange={({ detail }) =>
                                        setPlatform(detail.selectedOption.value)
                                    }
                                    options={meetingPlatforms}
                                />
                            </FormField>
                            <FormField
                                label="Meeting URL"
                                description={
                                    platform === "Teams"
                                        ? "Enter the full Teams meeting URL"
                                        : platform === "Chime"
                                        ? "Enter the Chime meeting URL"
                                        : "Enter the Webex meeting URL"
                                }
                            >
                                <Input
                                    value={meetingUrl}
                                    onChange={({ detail }) =>
                                        setMeetingUrl(detail.value)
                                    }
                                />
                            </FormField>
                            <FormField label="Meeting Password">
                                <Checkbox
                                    checked={showMeetingPassword}
                                    onChange={({ detail }) =>
                                        setShowMeetingPassword(detail.checked)
                                    }
                                >
                                    Add meeting password
                                </Checkbox>
                                {showMeetingPassword && (
                                    <Input
                                        type="password"
                                        value={meetingPassword}
                                        onChange={({ detail }) =>
                                            setMeetingPassword(detail.value)
                                        }
                                    />
                                )}
                            </FormField>
                            <FormField label="Meeting Time">
                                <Checkbox
                                    checked={showDateTime}
                                    onChange={({ detail }) =>
                                        setShowDateTime(detail.checked)
                                    }
                                >
                                    Schedule for later
                                </Checkbox>
                                {showDateTime && (
                                    <SpaceBetween direction="horizontal" size="xs">
                                        <DatePicker
                                            value={meetingDate}
                                            onChange={({ detail }) =>
                                                setMeetingDate(detail.value)
                                            }
                                        />
                                        <TimeInput
                                            value={meetingTime}
                                            onChange={({ detail }) =>
                                                setMeetingTime(detail.value)
                                            }
                                        />
                                    </SpaceBetween>
                                )}
                            </FormField>
                        </SpaceBetween>
                    </Form>
                    {error && (
                        <Alert type="error" header="Error">
                            {error}
                        </Alert>
                    )}
                </ContentLayout>
            }
            navigationHide={true}
            toolsHide={true}
        />
    );
}

