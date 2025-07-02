package main

import . "github.com/ber-sen/taskwish/packages/taskwish-go"

func main() {
	type Input struct {
		User    string `validate:"required,email"`
		Channel string `json:"channel"`
	}

	uc := UseCase("SayHello").
		Entry(&Input{}).
		Steps(
			Step("greet",
				func(props StepProps) interface{} {
					input := props.Get("input").(Input)

					return "Hello " + input.User
				},
				WithTimeout(100),
			),
			Run("Slack.sendMessage",
				Params{
					"...":     Param("scope"),
					"channel": Param("scope.greet"),
					"text":    "test",
				},
				WithTimeout(100),
			),
		)

	uc.Run()
}
