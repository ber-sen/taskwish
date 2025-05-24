package core

type StringType string

type Schema map[string]StringType

type Scope map[string]interface{}

type StepProps func(string) interface{}

type Params map[string]interface{}

type StepHandler func(props StepProps) interface{}

type Step struct {
	Name    string
	Handler StepHandler
}

type UseCaseFactory struct {
	Name  string
	Input Schema
	Steps []Step
	Scope Scope
}
