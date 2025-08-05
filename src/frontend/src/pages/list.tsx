import {
    AppLayout,
    Box,
    Button,
    Cards,
    ContentLayout,
    Header,
    HelpPanel,
} from "@cloudscape-design/components";
import { generateClient } from "aws-amplify/api";
import { useEffect, useState } from "react";
import { Invite } from "../API";
import NavigationComponent from "../components/navigation";
import { FlashbarComponent } from "../components/notifications";
import { deleteInvite } from "../graphql/mutations";
import { listInvites } from "../graphql/queries";
import { meetingPlatforms } from "../platform";

const List = () => {
    const [navigationOpen, setNavigationOpen] = useState<boolean>(true);
    const client = generateClient();
    const [invites, setInvites] = useState<Invite[]>([]);
    const [selectedInvites, setSelectedInvites] = useState<Invite[]>();

    useEffect(() => {
        const fetchInvites = async () => {
            try {
                const { data } = await client.graphql({
                    query: listInvites,
                });
                setInvites(data.listInvites?.items || []);
            } catch (error) {
                console.error("Failed to get invites.", error);
            }
        };
        fetchInvites();
    }, []);

    // Function to get platform label
    const getPlatformLabel = (platformValue: string) => {
        const platform = meetingPlatforms.find(p => p.value === platformValue);
        return platform ? platform.label : platformValue;
    };

    // Function to format meeting status
    const getStatusBadge = (status: string, platform: string) => {
        const statusText = status ?? "Scheduled";
        const platformText = getPlatformLabel(platform);
        return `${statusText} (${platformText})`;
    };

    return (
        <AppLayout
            navigation={<NavigationComponent />}
            navigationOpen={navigationOpen}
            onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
            notifications={<FlashbarComponent />}
            toolsHide={false}
            tools={
                <HelpPanel header={<h3>Instructions</h3>}>
                    <ul>
                        <li>
                            To delete an invite for an upcoming meeting, select
                            the invite then click <strong>Delete</strong>.
                        </li>
                    </ul>
                </HelpPanel>
            }
            content={
                <ContentLayout
                    header={
                        <Header
                            counter={`[${invites.length}]`}
                            actions={
                                <Button
                                    onClick={() => {
                                        if (selectedInvites) {
                                            selectedInvites.forEach((invite) => {
                                                client
                                                    .graphql({
                                                        query: deleteInvite,
                                                        variables: {
                                                            input: {
                                                                id: invite.id,
                                                            },
                                                        },
                                                    })
                                                    .catch((error) => {
                                                        console.error(
                                                            "Failed to delete invite.",
                                                            error
                                                        );
                                                    });
                                            });
                                            setInvites(
                                                invites.filter(
                                                    (invite) =>
                                                        !selectedInvites.includes(
                                                            invite
                                                        )
                                                )
                                            );
                                            setSelectedInvites([]);
                                        }
                                    }}
                                    disabled={
                                        !selectedInvites ||
                                        selectedInvites.length === 0
                                    }
                                >
                                    Delete
                                </Button>
                            }
                        >
                            Invites
                        </Header>
                    }
                >
                    <Cards
                        onSelectionChange={({ detail }) =>
                            setSelectedInvites(detail?.selectedItems ?? [])
                        }
                        selectedItems={selectedInvites}
                        cardDefinition={{
                            header: (invite) => invite.name,
                            sections: [
                                {
                                    id: "meeting_platform",
                                    header: "Meeting Platform",
                                    content: (invite) =>
                                        getPlatformLabel(invite.platform),
                                },
                                {
                                    id: "meeting_url",
                                    header: "Meeting URL",
                                    content: (invite) => invite.meetingURL,
                                },
                                {
                                    id: "meeting_password",
                                    header: "Meeting Password",
                                    content: (invite) => invite.meetingPassword,
                                },
                                {
                                    id: "meeting_time",
                                    header: "Meeting Time",
                                    content: (invite) => {
                                        if (!invite.meetingTime) return "Immediate";
                                        const meetingDateTime = new Date(
                                            invite.meetingTime
                                        );
                                        return meetingDateTime.toLocaleString(
                                            "en-US",
                                            {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                timeZoneName: "short",
                                            }
                                        );
                                    },
                                },
                                {
                                    id: "scribe_status",
                                    header: "Scribe Status",
                                    content: (invite) =>
                                        getStatusBadge(
                                            invite.status,
                                            invite.platform
                                        ),
                                },
                            ],
                        }}
                        cardsPerRow={[
                            { cards: 1 },
                            { minWidth: 500, cards: 3 },
                            { minWidth: 1000, cards: 6 },
                        ]}
                        items={invites}
                        loadingText="Loading invites"
                        selectionType="multi"
                        visibleSections={[
                            "meeting_platform",
                            "meeting_url",
                            "meeting_time",
                            "scribe_status",
                        ]}
                        empty={
                            <Box
                                margin={{ vertical: "xs" }}
                                textAlign="center"
                                color="inherit"
                            >
                                No invites
                            </Box>
                        }
                    />
                </ContentLayout>
            }
        />
    );
};

export default List;

