package taskwish

import (
	"context"
	"fmt"
	"time"

	core "github.com/ber-sen/taskwish/packages/taskwish-go/core"
)

type Scope = core.Scope

type Params = core.Params

type StepProps = core.StepProps

func Param(name string) interface{} {
	return nil
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
		Handler: func(props core.StepProps) interface{} {
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
	input any
	steps []core.Step
	scope core.Scope
}

func UseCase(name string) UseCaseFactory {
	return UseCaseFactory{
		name:  name,
		input: make(core.Schema),
		scope: make(core.Scope),
	}
}

func (uc UseCaseFactory) Input(schema any) UseCaseFactory {
	uc.input = schema
	return uc
}

func (uc UseCaseFactory) Steps(steps ...core.Step) UseCaseFactory {
	uc.steps = steps
	return uc
}

func (uc *UseCaseFactory) Run() {
	fmt.Printf("Running UseCase: %s\n", uc.name)

	for _, step := range uc.steps {
		fmt.Printf("Step: %s\n", step.Name)
		result := step.Handler(core.StepProps{})

		if result != nil {
			fmt.Printf("Result: %v\n", result)
		}
	}
}

func WithTimeout(duration time.Duration) core.Option {
	return func(ctx context.Context, value interface{}) interface{} {
		time.Sleep(duration)
		return value
	}
}
