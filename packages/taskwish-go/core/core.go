package core

type StringType string

type Schema map[string]StringType

type Scope map[string]interface{}

type Params map[string]interface{}

type StepHandler func(scope Scope) interface{}

type Step struct {
	Name    string
	Handler StepHandler
}

type UseCaseFactory struct {
	Name  string
	Input Schema
	Steps []Step
	cope  Scope
}
