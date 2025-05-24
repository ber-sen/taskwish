package main

import . "github.com/ber-sen/taskwish/packages/taskwish-go"

func main() {
	uc := UseCase("SayHello").
		Input(Schema{
			"user":    Type("string"),
			"channel": Type("string"),
		}).
		Steps(
			Step("greet", func(scope Scope) interface{} {
				user, _ := scope["user"].(string)
				return "Hello " + user
			}),
			Run("Slack.sendMessage", Params{"channel": "{{ scope.greed }}", "text": "test"}),
		)

	uc.Run()
}
