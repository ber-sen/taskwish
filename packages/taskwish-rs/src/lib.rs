use anymap::AnyMap;
use serde::Serialize;
use serde_json;
use serde_json::{Map, Value};
use wasm_bindgen::prelude::*;

macro_rules! steps {
    ( $( $name:ident -> $ret:ty => $func:expr ),* $(,)? ) => {{
        let mut steps = AnyMap::new();
        let mut json_map = Map::new();

        $(
            #[derive(Serialize)]
            struct $name {
                value: $ret,
            }

            impl $name {
                pub fn run(scope: &AnyMap) -> $ret {
                    ($func)(scope)
                }

                pub fn new(scope: &AnyMap) -> Self {
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
        #[derive(Serialize)]
        pub struct SendMessage {
            pub channel: String,
            pub message: String,
        }

        impl SendMessage {
            pub fn run(channel: &str, message: &str) -> Self {
                Self {
                    channel: channel.to_string(),
                    message: message.to_string(),
                }
            }
        }
    }
}

#[wasm_bindgen]
pub fn hello() -> String {
    let steps = steps!(
        HelloWorld -> taskwish::slack::SendMessage =>
            |_scope| taskwish::slack::SendMessage::run("#general", "Hello World!"),

        AgeStep -> String => |scope: &AnyMap|
            scope.get::<HelloWorld>().expect("Not found").value.message.clone(),

        IsAdmin -> String =>
            |_scope| {
                let steps = steps!(
                    Asd -> String =>
                        |scope: &AnyMap| {
                            let res = scope.get::<AgeStep>()
                                .map(|s| s.value.clone())
                                .unwrap_or_else(|| "default".to_string());
                            res
                    }
                );

                let combined_json = serde_json::to_string(&steps.1).unwrap();
                combined_json
        },
    );

    let combined_json = serde_json::to_string(&steps.1).unwrap();

    combined_json
}
