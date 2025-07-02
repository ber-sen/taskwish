package taskwish

import (
	"fmt"
	"time"

	core "github.com/ber-sen/taskwish/packages/taskwish-go/core"
)

type Scope = core.Scope

type Params = core.Params

func Get(key string, scopes ...Scope) interface{} {
	ctx := scopes[0]

	return ctx.Value(key)
}

func Step(name string, handler core.StepHandler, options ...core.Option) core.Step {
	return core.Step{
		Name:    name,
		Handler: handler,
		Customizable: core.Customizable{
			Options: options,
		},
	}
}

func Run(name string, params Params, options ...core.Option) core.Step {
	return core.Step{
		Name: name,
		Handler: func(props core.Scope) interface{} {
			fmt.Printf("Trigger sent to channel %s", params)
			return nil
		},
		Customizable: core.Customizable{
			Options: options,
		},
	}
}

type UseCaseFactory struct {
	name  string
	entry any
	steps []core.Step
}

func UseCase(name string) UseCaseFactory {
	return UseCaseFactory{
		name:  name,
		entry: make(core.Schema),
	}
}

func (uc UseCaseFactory) Entry(schema any) UseCaseFactory {
	uc.entry = schema
	return uc
}

func (uc UseCaseFactory) Steps(steps ...core.Step) UseCaseFactory {
	uc.steps = steps
	return uc
}

func (uc *UseCaseFactory) Run(scope core.Scope) {
	fmt.Printf("Running UseCase: %s\n", uc.name)

	for _, step := range uc.steps {
		fmt.Printf("Step: %s\n", step.Name)
		result := step.Handler(scope)

		if result != nil {
			fmt.Printf("Result: %v\n", result)
		}
	}
}

func WithTimeout(duration time.Duration) core.Option {
	return func(ctx core.Scope, value interface{}) interface{} {
		time.Sleep(duration)
		return value
	}
}
