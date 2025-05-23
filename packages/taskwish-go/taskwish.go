package taskwish

import "fmt"

type StringType string

type Schema map[string]StringType

type Scope map[string]interface{}

type Params map[string]interface{}

type StepHandler func(scope Scope) interface{}

type StepDef struct {
	Name    string
	Handler StepHandler
}

func Type(t string) StringType {
	return StringType(t)
}

func Step(name string, handler StepHandler) StepDef {
	return StepDef{
		Name:    name,
		Handler: handler,
	}
}

func Trigger(name string, params Params) StepDef {
	return StepDef{
		Name: name,
		Handler: func(scope Scope) interface{} {
			fmt.Printf("Trigger sent to channel %s", params)
			return nil
		},
	}
}

type UseCaseFactory struct {
	name  string
	input Schema
	steps []StepDef
	scope Scope
}

func UseCase(name string) UseCaseFactory {
	return UseCaseFactory{
		name:  name,
		input: make(Schema),
		scope: make(Scope),
	}
}

func (uc UseCaseFactory) Input(schema Schema) UseCaseFactory {
	uc.input = schema
	return uc
}

func (uc UseCaseFactory) Steps(steps ...StepDef) UseCaseFactory {
	uc.steps = steps
	return uc
}

func (uc *UseCaseFactory) Execute() {
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
