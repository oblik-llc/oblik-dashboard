import { PublishCommand } from "@aws-sdk/client-sns";
import { getSNSClient } from "./client";
import type { AlertType } from "@/lib/types/alerts";

export async function sendEmailAlert(
  snsTopicArn: string,
  subject: string,
  message: string
): Promise<void> {
  const client = getSNSClient();

  await client.send(
    new PublishCommand({
      TopicArn: snsTopicArn,
      Subject: subject.slice(0, 100), // SNS subject max 100 chars
      Message: message,
    })
  );
}

export async function sendSlackAlert(
  webhookUrl: string,
  message: string,
  pipelineId: string,
  alertType: AlertType
): Promise<void> {
  const emoji =
    alertType === "recovery"
      ? ":white_check_mark:"
      : ":rotating_light:";

  const color =
    alertType === "recovery" ? "#36a64f" : "#e01e5a";

  const payload = {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *Oblik Alert — ${pipelineId}*`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
        },
      },
    ],
    attachments: [
      {
        color,
        fields: [
          { title: "Pipeline", value: pipelineId, short: true },
          { title: "Alert Type", value: alertType.replace("_", " "), short: true },
        ],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook returned ${response.status}: ${body}`);
  }
}
