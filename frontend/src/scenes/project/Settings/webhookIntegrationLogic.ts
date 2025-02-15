import { kea } from 'kea'
import api from 'lib/api'
import { errorToast } from 'lib/utils'
import { teamLogic } from 'scenes/teamLogic'
import { webhookIntegrationLogicType } from './webhookIntegrationLogicType'

function adjustDiscordWebhook(webhookUrl: string): string {
    // We need Discord webhook URLs to end with /slack for proper handling, this ensures that
    return webhookUrl.replace(/\/*(?:posthog|slack)?\/?$/, '/slack')
}

export const webhookIntegrationLogic = kea<webhookIntegrationLogicType>({
    loaders: ({ actions }) => ({
        testedWebhook: [
            null as string | null,
            {
                testWebhook: async (webhook: string) => {
                    if (webhook?.includes('discord.com/')) {
                        webhook = adjustDiscordWebhook(webhook)
                    }

                    if (webhook) {
                        try {
                            const response = await api.create('api/user/test_slack_webhook', { webhook })
                            if (response.success) {
                                return webhook
                            } else {
                                actions.testWebhookFailure(response.error)
                            }
                        } catch (error) {
                            actions.testWebhookFailure(error.message)
                        }
                    }
                    return null
                },
            },
        ],
    }),
    listeners: () => ({
        testWebhookSuccess: async ({ testedWebhook }) => {
            if (testedWebhook) {
                teamLogic.actions.updateCurrentTeam({ slack_incoming_webhook: testedWebhook })
            }
        },
        testWebhookFailure: ({ error }) => {
            errorToast('Error validating your webhook', 'Your webhook returned the following error response:', error)
        },
    }),
    selectors: {
        loading: [
            (s) => [s.testedWebhookLoading, teamLogic.selectors.currentTeamLoading],
            (testedWebhookLoading: boolean, currentTeamLoading: boolean) => testedWebhookLoading || currentTeamLoading,
        ],
    },
})
