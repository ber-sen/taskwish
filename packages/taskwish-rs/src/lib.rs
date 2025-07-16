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
    ( $( $name:ident = $func:expr ),* $(,)? ) => {{
        let mut steps = Scope::new();
        let mut json_map = Map::new();
        paste! {
            $(
                let [<step_ ${index()}>] = Rc::new(Step { handler: $func });
                let value = ([<step_ ${index()}>].handler)(&steps);
                json_map.insert(stringify!([<step_ ${index()}>]).to_string(), serde_json::to_value(&value).unwrap());
                steps.insert([<step_ ${index()}>].clone());
                let $name = [<step_ ${index()}>];
            )*
        }
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

    let steps = steps!(
        hello_world = step!(4),
        __ = step!(|input: hello_world| input),
        __ = step!("end")
    );

    // let _use_case = make!(UseCase, name = "asdasd", run = steps);

    Response::from_json(&steps.1)
}
