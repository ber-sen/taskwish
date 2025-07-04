use anymap::AnyMap;
use serde::Serialize;
use serde_json;
use serde_json::{Map, Value};
use wasm_bindgen::prelude::*;
type Scope = AnyMap;

macro_rules! step {
    ($closure:expr) => {
        $closure
    };
}

macro_rules! steps {
    (
        $(
            ($name:ident, $ret:ty),
            $func:expr
        ),* $(,)?
    ) => {{
        let mut steps = Scope::new();
        let mut json_map = Map::new();

        $(
            #[derive(Serialize)]
            struct $name {
                value: $ret,
            }

            impl $name {
                pub fn run(scope: &Scope) -> $ret {
                    ($func)(scope)
                }

                pub fn new(scope: &Scope) -> Self {
                    Self { value: Self::run(scope) }
                }

                #[allow(dead_code)]
                pub fn get(&self) -> &$ret {
                    &self.value
                }
            }

            let step_instance = $name::new(&steps);
            json_map.insert(stringify!($name).to_string(), Value::String(serde_json::to_string(&step_instance.value).unwrap()));
            steps.insert(step_instance);
        )*

        (steps, json_map)
    }};
}

pub mod taskwish {
    pub mod slack {
        use serde::Serialize;

        #[derive(Serialize, Debug)]
        pub struct SendMessage {
            channel: String,
            pub(crate) message: String,
        }

        impl SendMessage {
            pub fn build() -> SendMessageBuilder {
                SendMessageBuilder::new()
            }
        }

        pub struct SendMessageBuilder {
            channel: Option<String>,
            message: Option<String>,
        }

        impl SendMessageBuilder {
            pub fn new() -> Self {
                Self {
                    channel: None,
                    message: None,
                }
            }

            pub fn channel(mut self, channel: &str) -> Self {
                self.channel = Some(channel.to_string());
                self
            }

            pub fn message(mut self, message: &str) -> Self {
                self.message = Some(message.to_string());
                self
            }

            pub fn run(self) -> SendMessage {
                SendMessage {
                    channel: self.channel.unwrap(),
                    message: self.message.unwrap(),
                }
            }
        }
    }
}

#[wasm_bindgen]
pub fn hello() -> String {
    let steps = steps!(
        (HelloWorld, taskwish::slack::SendMessage),
        step!(|_scope| taskwish::slack::SendMessage::build()
            .channel("#general")
            .message("HelloWorld")
            .run()),
        //
        (AgeStep, String),
        step!(|scope: &Scope| scope.get::<HelloWorld>().unwrap().get().message.clone()),
        //
        (Final, i128),
        step!(|_scope| 3)
    );

    let combined_json = serde_json::to_string(&steps.1).unwrap();
    combined_json
}
