package taskwish

import (
	"fmt"

	core "github.com/ber-sen/taskwish/packages/taskwish-go/core"
)

type Schema = core.Schema

type Scope = core.Scope

type Params = core.Scope

func Type(t string) core.StringType {
	return core.StringType(t)
}

func Step(name string, handler core.StepHandler) core.Step {
	return core.Step{
		Name:    name,
		Handler: handler,
	}
}

func Run(name string, params Params) core.Step {
	return core.Step{
		Name: name,
		Handler: func(scope Scope) interface{} {
			fmt.Printf("Trigger sent to channel %s", params)
			return nil
		},
	}
}

type UseCaseFactory struct {
	name  string
	input core.Schema
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

func (uc UseCaseFactory) Input(schema core.Schema) UseCaseFactory {
	uc.input = schema
	return uc
}

func (uc UseCaseFactory) Steps(steps ...core.Step) UseCaseFactory {
	uc.steps = steps
	return uc
}

func (uc *UseCaseFactory) Run() {
	for k := range uc.input {
		if _, exists := uc.scope[k]; !exists {
			uc.scope[k] = nil
		}
	}

	fmt.Printf("Running UseCase: %s\n", uc.name)

	for _, step := range uc.steps {
		fmt.Printf("Step: %s\n", step.Name)
		result := step.Handler(uc.scope)
		if result != nil {
			fmt.Printf("Result: %v\n", result)
		}
	}
}
