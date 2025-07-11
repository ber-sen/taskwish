use anymap::AnyMap;
use serde_json::Map;
use serde_json::{self};
type Scope = AnyMap;
use std::any::Any;
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
    (|$var:ident : $inp:ident| $body:expr) => {{
        move |scope: &Scope| {
            let a = use_value(&$inp.clone(), &scope.clone()).unwrap();

            let $var = handler(|| (a.handler)(&Scope::new()));

            $body
        }
    }};
    ($closure:expr) => {
        |_scope: &Scope| $closure
    };
}

macro_rules! make {
    (
        $struct:ident, $(
            $name:ident = $value:expr
        ),* $(,)?
    ) => {{
        let mut a = $struct::default();

        $(
            a.$name = $value;
            #[allow(unused_variables)]
            let $name = a.$name;
        )*

        let entity = $struct{
            $(
                $name: $value,
            )*
        };

        entity
    }};
}

macro_rules! steps {
    (
        $(
            $name:ident = $func:expr
        ),* $(,)?
    ) => {{
        let mut steps = Scope::new();
        let mut json_map = Map::new();

        $(
            let $name = Rc::new(Step{ handler: $func });
            let value = ($name.handler)(&steps);
            json_map.insert(stringify!($name).to_string(), serde_json::to_value(&value).unwrap());
            steps.insert($name.clone());

        )*

        Box::new((steps, json_map))
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

struct UseCase<T> {
    name: String,
    run: T,
}

impl Default for UseCase<Box<dyn Any>> {
    fn default() -> Self {
        Self {
            name: "".to_string(),
            run: Box::new(0),
        }
    }
}

#[event(fetch)]
async fn fetch(_req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    console_error_panic_hook::set_once();

    let use_case = make!(
        UseCase,
        name = "asdasd".into(),
        run = steps!(
            hello_world = step!(
                taskwish::slack::SendMessage::build()
                    .channel("#general")
                    .message("HelloWorld")
                    .run()
            ),
            last = step!(|input: hello_world| match input.message == "HelloWorld" {
                true => 3,
                _ => 2,
            }),
            end = step!("end")
        )
    );

    Response::from_json(&use_case.name)
}
