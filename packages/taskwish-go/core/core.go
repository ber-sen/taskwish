package core

import "context"

type StringType string

type Schema map[string]StringType

type Scope context.Context

type Params map[string]interface{}

type StepHandler func(scope Scope) interface{}

type Option func(scope Scope, value interface{}) interface{}

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
