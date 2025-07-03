use anymap::AnyMap;
use serde::Serialize;
use serde_json;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

macro_rules! steps {
    ( $( $name:ident -> $ret:ty => $func:expr ),* $(,)? ) => {{
        let mut steps = AnyMap::new();
        let mut json_map: HashMap<&'static str, String> = HashMap::new();

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
            json_map.insert(stringify!($name), serde_json::to_string(&step_instance.value).unwrap());
            steps.insert(step_instance);
        )*

        (steps, json_map)
    }};
}

#[wasm_bindgen]
pub fn hello() -> String {
    let (_steps, json_map) = steps!(

        HelloWorld -> String =>
            |_scope| "Hello, Bersen!".to_string(),

        AgeStep -> String =>
            |scope: &AnyMap| {
                let step = scope.get::<HelloWorld>().expect("Not found");
                step.value.to_string()

        },

        IsAdmin -> String =>
            |_scope| {
                let (_steps, json_map) = steps!(

                    Asd -> String =>
                        |scope: &AnyMap| {
                            let res = scope.get::<AgeStep>()
                                .map(|s| s.value.clone())
                                .unwrap_or_else(|| "default".to_string());
                            res
                    }

                );

                let combined_json = serde_json::to_string(&json_map).unwrap();
                combined_json
        },
    );

    let combined_json = serde_json::to_string(&json_map).unwrap();

    combined_json
}
