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
    Input,
    Select,
    SpaceBetween,
    TimeInput,
} from "@cloudscape-design/components";
import { generateClient } from "aws-amplify/api";
import { useContext, useState } from "react";
import { CreateInviteInput } from "../API";
import { NotificationContext } from "../components/notifications";
import NavigationComponent from "../components/navigation";
import { createInvite } from "../graphql/mutations";
import { meetingPlatforms } from "../platform";

export default function Create() {
    const [name, setName] = useState("");
    const [platform, setPlatform] = useState<string>(meetingPlatforms[0].value);
    const [meetingId, setMeetingId] = useState("");
    const [meetingPassword, setMeetingPassword] = useState("");
    const [showMeetingPassword, setShowMeetingPassword] = useState(false);
    const [meetingDate, setMeetingDate] = useState<string | null>(null);
    const [meetingTime, setMeetingTime] = useState<string | null>(null);
    const [showDateTime, setShowDateTime] = useState(false);
    const [error, setError] = useState("");
    const { addNotification } = useContext(NotificationContext);
    const client = generateClient();

    const handleSubmit = async () => {
        if (!name) {
            setError("Name is required");
            return;
        }

        if (!meetingId) {
            setError("Meeting ID is required");
            return;
        }

        const input: CreateInviteInput = {
            name,
            meetingPlatform: platform,
            meetingId,
            meetingTime: showDateTime && meetingDate && meetingTime
                ? Math.floor(new Date(`${meetingDate}T${meetingTime}`).getTime() / 1000)
                : Math.floor(Date.now() / 1000),
        };

        if (showMeetingPassword && meetingPassword) {
            input.meetingPassword = meetingPassword;
        }

        try {
            await client.graphql({
                query: createInvite,
                variables: { input },
            });

            addNotification({
                type: "success",
                content: "Successfully created invite",
                dismissible: true,
                onDismiss: () => {},
            });

            setName("");
            setPlatform(meetingPlatforms[0].value);
            setMeetingId("");
            setMeetingPassword("");
            setShowMeetingPassword(false);
            setMeetingDate(null);
            setMeetingTime(null);
            setShowDateTime(false);
            setError("");
        } catch (error) {
            console.error(error);
            addNotification({
                type: "error",
                content: "Error creating invite",
                dismissible: true,
                onDismiss: () => {},
            });
        }
    };

    return (
        <AppLayout
            navigation={<NavigationComponent />}
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
                                    onClick={() => handleSubmit()}
                                    disabled={!name || !meetingId}
                                >
                                    {showDateTime ? "Schedule Invite" : "Create Invite"}
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        <SpaceBetween direction="vertical" size="l">
                            <FormField label="Name">
                                <Input
                                    value={name}
                                    onChange={({ detail }) => setName(detail.value)}
                                />
                            </FormField>
                            <FormField label="Platform">
                                <Select
                                    selectedOption={meetingPlatforms.find(p => p.value === platform) || null}
                                    onChange={({ detail }) => setPlatform(detail.selectedOption?.value || meetingPlatforms[0].value)}
                                    options={meetingPlatforms}
                                />
                            </FormField>
                            <FormField label="Meeting ID">
                                <Input
                                    value={meetingId}
                                    onChange={({ detail }) => setMeetingId(detail.value)}
                                />
                            </FormField>
                            <FormField>
                                <Checkbox
                                    checked={showMeetingPassword}
                                    onChange={({ detail }) => setShowMeetingPassword(detail.checked)}
                                >
                                    Add meeting password
                                </Checkbox>
                                {showMeetingPassword && (
                                    <Input
                                        type="password"
                                        value={meetingPassword}
                                        onChange={({ detail }) => setMeetingPassword(detail.value)}
                                    />
                                )}
                            </FormField>
                            <FormField>
                                <Checkbox
                                    checked={showDateTime}
                                    onChange={({ detail }) => setShowDateTime(detail.checked)}
                                >
                                    Schedule for later
                                </Checkbox>
                                {showDateTime && (
                                    <SpaceBetween direction="horizontal" size="xs">
                                        <DatePicker
                                            value={meetingDate || ""}
                                            onChange={({ detail }) => setMeetingDate(detail.value)}
                                        />
                                        <TimeInput
                                            value={meetingTime || ""}
                                            onChange={({ detail }) => setMeetingTime(detail.value)}
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
        />
    );
}

