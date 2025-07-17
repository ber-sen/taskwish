#![feature(macro_metavar_expr)]
use anymap::AnyMap;
use paste::paste;
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

trait IntoOwned {
    type Owned;
    fn into_owned(self) -> Self::Owned;
}

// For &str → String
impl<'a> IntoOwned for &'a str {
    type Owned = String;
    fn into_owned(self) -> Self::Owned {
        self.to_owned()
    }
}

// For &str → String
impl<'a> IntoOwned for String {
    type Owned = String;
    fn into_owned(self) -> Self::Owned {
        self
    }
}

// For &T → T where T: Clone
impl<'a, T: Clone> IntoOwned for &'a T {
    type Owned = T;
    fn into_owned(self) -> Self::Owned {
        self.clone()
    }
}

impl<T> IntoOwned for Box<T> {
    type Owned = Box<T>;

    fn into_owned(self) -> Self::Owned {
        self
    }
}

fn to_owned<T: IntoOwned>(value: T) -> T::Owned {
    value.into_owned()
}

macro_rules! with {
    (|$var:ident : $inp:ident| $body:expr) => {{
        move |scope: &Scope| {
            let a = use_value(&$inp.clone(), &scope.clone()).unwrap();

            let $var = handler(|| (a.handler)(&Scope::new()));

            $body
        }
    }};
}

macro_rules! make {
    (
        $struct:ident, $(
            $name:ident = $value:expr
        ),* $(,)?
    ) => {{
        $(
            let $name = to_owned($value);
        )*

        let instance = $struct::builder().
        $(
            $name($name).
        )*
        build();

        instance
    }};
}

macro_rules! steps {
    ( $( $item:tt ),* $(,)? ) => {{
        let mut steps = Scope::new();
        let mut json_map = serde_json::Map::new();

        $(
            steps_parse_item!($item, steps, json_map);
        )*

        Box::new((steps, json_map))
    }};
}

macro_rules! steps_parse_item {
    // Case: (name, expr)
    ( ($name:ident, $func:expr), $steps:ident, $json_map:ident ) => {
        // paste::paste! {
        let $name = $func;
        $json_map.insert(stringify!($name).to_string(), "".into());
        $steps.insert($name.clone());
        // }
    };
    // Case: (name) only
    ( $func:block, $steps:ident, $json_map:ident ) => {
        // paste::paste! {
        // Provide a default expression or handle missing func
        let step = $func;
        $steps.insert(step.clone());
        // }
    };
    ( ($func:expr), $steps:ident, $json_map:ident ) => {
        // paste::paste! {
        // Provide a default expression or handle missing func
        let step = $func;
        $steps.insert(step.clone());
        // }
    };
}

mod slack {
    use bon::Builder;
    use serde::Serialize;
    #[derive(Builder, Serialize, Debug)]
    #[builder(on(String, into))]
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
        name = "asdasd",
        run = steps!(
            (title, "Hello World"),
            (message, {
                slack::SendMessage::builder()
                    .channel("#general")
                    .message("Hello")
                    .build()
            }),
            (with!(|input: message| input))
        )
    );

    Response::from_json(&use_case.name)
}
