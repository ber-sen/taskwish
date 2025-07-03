package main

import (
	"context"
	"time"

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
			AsyncStep("async", func(yield chan<- any, scope Scope) {
				time.Sleep(1 * time.Second)
				result := 42
				yield <- result
			}),
			Step("greet",
				func(scope Scope) string {
					input := Get("entry", scope).(Input)

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
