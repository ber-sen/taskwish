package core

import "context"

type Scope context.Context

type Params map[string]any

type StepHandler[T any] func(scope Scope) T

type Option func(scope Scope, value any) any

type Customizable struct {
	Options []Option
}

type Step[T any] struct {
	Name    string
	Handler StepHandler[T]
	Customizable
}

type UseCaseFactory struct {
	Name  string
	Input any
	Steps []Step[any]
	Scope Scope
}
