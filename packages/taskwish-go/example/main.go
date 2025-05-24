package main

import . "github.com/ber-sen/taskwish/packages/taskwish-go"

func main() {
	uc := UseCase("SayHello").
		Input(Schema{
			"user":    Type("string"),
			"channel": Type("string"),
		}).
		Steps(
			Step("greet", func(props StepProps) interface{} {
				user, _ := props("user").(string)

				return "Hello " + user
			}),
			Run("Slack.sendMessage", Params{"channel": Props("scope.greet"), "text": "test"}),
		)

	uc.Run()
}
