export const startupMessage = (baseUrl: string, apiKey: string) => `Taskwish example server listening on ${baseUrl}
API key: ${apiKey}

Greeter action:
curl -H "Authorization: Bearer ${apiKey}" "${baseUrl}/tw/Greeter::hello?name=World"

Biller receiving Greeter Message:
curl -X POST -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"content":"hi"}' "${baseUrl}/tw/Biller::on_greeter_message"`;
