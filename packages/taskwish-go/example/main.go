package main

import (
	"context"

	. "github.com/ber-sen/taskwish/packages/taskwish-go"
)

func main() {
	type Input struct {
		User    string `validate:"required,email"`
		Channel string `json:"channel"`
	}

	uc := UseCase("SayHello").
		Entry(&Input{}).
		Steps(
			Step("greet",
				func(scope Scope) string {
					input := Get("input", scope).(Input)

					return "Hello " + input.User
				},
				WithTimeout(100),
			),
			Run("Slack.sendMessage",
				Params{
					"...":     Get("scope"),
					"channel": Get("scope.greet"),
					"text":    "test",
				},
				WithTimeout(100),
			),
		)

	uc.Run(context.Background())
}
