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
			Trigger("#general", Params{"channal": "#general", "text": "test"}),
		)

	uc.Execute()
}
