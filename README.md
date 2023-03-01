# Proposal Slackbot

Proposal notifications for governance proposals from the Proposal API: https://proposal-api.vercel.app/api/proposal

## Repo Set up
- Create a .env file with two vars, ALCHEMY_API & SLACK_INCOMING_WEBHOOK
- ALCHEMY_API should be a mainnet key
- SLACK_INCOMING_WEBHOOK: Use incoming webhooks on Slack for a specific channel where you want notifications

## Heroku Set Up

- Set Heroku Scheduler to Daily with matching .env variables (ALCHEMY_API & SLACK_INCOMING_WEBHOOK)
- Run command: npm start

