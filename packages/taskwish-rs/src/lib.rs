use anymap::AnyMap;
use serde_json;
use serde_json::Map;
type Scope = AnyMap;
use std::rc::Rc;
use worker::*;

fn handler<F, R>(f: F) -> R
where
    F: FnOnce() -> R,
{
    f()
}

struct Step<T> {
    handler: T,
}

fn use_value<'a, T: 'static>(_: &T, map: &'a AnyMap) -> Option<&'a T> {
    map.get::<T>()
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
    (|$var:ident : $inp:ident| $body:block) => {{
        move |scope: &Scope| {
            let a = use_value(&$inp, &scope.clone()).unwrap();

            let $var = handler(|| (a.handler)(&Scope::new()));

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
            let $name = Rc::new(Step{ handler: $func });
            let value = ($func)(&steps);
            json_map.insert(stringify!($name).to_string(), serde_json::to_value(&value).unwrap());
            steps.insert($name.clone());

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
        end,
        step!(|input: hello_wold| { input.message }),
    );

    Response::from_json(&steps.1)
}
