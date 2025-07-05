use anymap::AnyMap;
use serde::Serialize;
use serde_json;
use serde_json::Map;
type Scope = AnyMap;
use worker::*;

fn handler<F, R>(f: F) -> R
where
    F: FnOnce() -> R,
{
    f()
}

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
            $name:ident,
            $func:expr
        ),* $(,)?
    ) => {{
        let mut steps = Scope::new();
        let mut json_map = Map::new();

        $(
            let $name = handler(|| $func(&Scope::new()));


            // let step_instance = $name::new(&steps);
            json_map.insert(stringify!($name).to_string(), serde_json::to_value(&$name).unwrap());
            // steps.insert(step_instance);
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
        hello_wold,
        step!(
            taskwish::slack::SendMessage::build()
                .channel("#general")
                .message("HelloWorld")
                .run()
        ),
        asd,
        step!(3),
        //
        // (asd),
        // step!({ input.0.message.clone() }),
    );

    Response::from_json(&steps.1)
}
