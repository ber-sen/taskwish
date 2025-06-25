package core

import "context"

type StringType string

type Schema map[string]StringType

type Scope map[string]interface{}

type StepProps struct{}

func (s StepProps) Get(value string) any {
	var result any
	return result
}

type Params map[string]interface{}

type StepHandler func(props StepProps) interface{}

type Option func(ctx context.Context, value interface{}) interface{}

type Customizable struct {
	Options []Option
}

type Step struct {
	Customizable
	Name    string
	Handler StepHandler
}

type UseCaseFactory struct {
	Name  string
	Input Schema
	Steps []Step
	Scope Scope
}
