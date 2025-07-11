use anymap::AnyMap;
use serde_json::Map;
use serde_json::{self};
type Scope = AnyMap;
use bon::Builder;
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
        let instance = $struct::builder().
        $(
            $name($value).
        )*
        build();

        instance
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

mod slack {
    use bon::Builder;
    use serde::Serialize;
    #[derive(Builder, Serialize, Debug)]
    pub struct SendMessage {
        pub channel: String,
        pub message: String,
    }
}
#[derive(Builder)]
struct UseCase<T> {
    name: Option<String>,
    run: T,
}

#[event(fetch)]
async fn fetch(_req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    console_error_panic_hook::set_once();

    let use_case = make!(
        UseCase,
        name = "asdasd".into(),
        run = steps!(
            hello_world = step!(
                slack::SendMessage::builder()
                    .channel("#general".into())
                    .message("HelloWorld".into())
                    .build()
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
