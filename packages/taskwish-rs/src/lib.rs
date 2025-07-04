use anymap::AnyMap;
use serde::Serialize;
use serde_json;
use serde_json::Map;
type Scope = AnyMap;
use worker::*;

macro_rules! step {
    (|$input:ident : ($($ty:ty),+)| $body:block) => {{
        move |scope: &Scope| {
            let $input = (
                $(scope.get::<$ty>().unwrap().get()),+
            );
            $body
        }
    }};
    (|$var:ident : $inp:ty| $body:block) => {{
        move |scope: &Scope| {
            let $var = scope.get::<$inp>().unwrap().get();
            $body
        }
    }};
    ($closure:expr) => {
        |_scope: &Scope| $closure
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
            json_map.insert(stringify!($name).to_string(), serde_json::to_value(&step_instance.value).unwrap());
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

#[event(fetch)]
async fn fetch(_req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    console_error_panic_hook::set_once();

    let steps = steps!(
        (HelloWorld, taskwish::slack::SendMessage),
        step!(
            taskwish::slack::SendMessage::build()
                .channel("#general")
                .message("HelloWorld")
                .run()
        ),
        //
        (Final, i128),
        step!(3),
        //
        (AgeStep, String),
        step!(|input: (HelloWorld, Final)| { input.0.message.clone() }),
    );

    Response::from_json(&steps.1)
}
