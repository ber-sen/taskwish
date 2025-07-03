package taskwish

import (
	"fmt"
	"time"

	core "github.com/ber-sen/taskwish/packages/taskwish-go/core"
)

type Scope = core.Scope

type Params = core.Params

func Get(key string, scopes ...Scope) any {
	ctx := scopes[0]

	return ctx.Value(key)
}

func AsyncStep(name string, handler func(yield chan<- any, scope Scope), options ...core.Option) core.Step[any] {
	wrappedHandler := func(scope core.Scope) any {
		return 3
	}

	return core.Step[any]{
		Name:    name,
		Handler: wrappedHandler,
		Customizable: core.Customizable{
			Options: options,
		},
	}
}

func Step[T any](name string, handler core.StepHandler[T], options ...core.Option) core.Step[any] {
	wrappedHandler := func(scope core.Scope) any {
		result := handler(scope)
		return any(result)
	}

	return core.Step[any]{
		Name:    name,
		Handler: wrappedHandler,
		Customizable: core.Customizable{
			Options: options,
		},
	}
}

func Run(name string, params Params, options ...core.Option) core.Step[any] {
	return core.Step[any]{
		Name: name,
		Handler: func(props core.Scope) any {
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
	steps []core.Step[any]
}

func UseCase(name string) UseCaseFactory {
	return UseCaseFactory{
		name: name,
	}
}

func (uc UseCaseFactory) Entry(schema any) UseCaseFactory {
	uc.entry = schema
	return uc
}

func (uc UseCaseFactory) Steps(steps ...core.Step[any]) UseCaseFactory {
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
	return func(ctx core.Scope, value any) any {
		time.Sleep(duration)
		return value
	}
}
