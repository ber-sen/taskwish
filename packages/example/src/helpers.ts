export const startupMessage = (baseUrl: string, apiKey: string) => `Taskwish example server listening on ${baseUrl}
API key: ${apiKey}

Greeter action:
curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/tw/Greeter/hello?name=World"

Open browser:
curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/tw/Browser/browse?url=https%3A%2F%2Fgoogle.com"

Open first Hacker News story:
curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/tw/HackerNews/open-first-page"

Open first Hacker News story:
curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/tw/Streamer/count?total=100";
`;

