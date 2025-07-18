#![feature(macro_metavar_expr)]
use anymap::AnyMap;
use serde_json::{self};
type Scope = AnyMap;
use bon::Builder;
use std::ops::Add;
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

macro_rules! steps {
    ( $( $item:tt ),* $(,)? ) => {{
        let mut steps = Scope::new();
        let mut json_map = serde_json::Map::new();

        $(
            steps_parse_item!(steps, json_map, $item);
        )*

        Box::new((steps, json_map))
    }};
}

macro_rules! steps_parse_item {
    // Case: (name, expr)
    ( $steps:ident, $json_map:ident, [$name:ident = $func:expr] ) => {
        // paste::paste! {
        let $name = $func;
        $json_map.insert(stringify!($name).to_string(), "".into());
        $steps.insert($name.clone());
        // }
    };
    ( $steps:ident, $json_map:ident, [$func:expr]) => {
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

#[derive(Builder)]
struct DB {
    update: Option<String>,
    set: Option<String>,
}

macro_rules! UseCase {
    (
        $(
            $name:ident = $value:expr
        ),* $(,)?
    ) => {{
        $(
            let $name = to_owned($value);
        )*

        let instance = UseCase::builder().
        $(
            $name($name).
        )*
        build();

        instance
    }};
}

#[derive(Builder)]
struct View {
    class: Option<String>,
}

macro_rules! View {
    (
        $(
            $name:ident = $value:expr,
        ),* $(,)?
        $(
            [$child:expr]
        ),* $(,)?
    ) => {{
        $(
            let $name = to_owned($value);
        )*

        let instance = View::builder().
        $(
            $name($name).
        )*
        build();

        instance
    }};
}

impl Add for View {
    type Output = View;

    fn add(self, other: View) -> View {
        let combined_class = match (self.class, other.class) {
            (Some(c1), Some(c2)) => Some(format!("{} {}", c1, c2)),
            (Some(c1), None) => Some(c1),
            (None, Some(c2)) => Some(c2),
            (None, None) => None,
        };

        View {
            class: combined_class,
        }
    }
}

#[event(fetch)]
async fn fetch(_req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    console_error_panic_hook::set_once();

    let ui = View!(
        class = "flex flex-col gap-4",
        [View!(class = "flex flex-col gap-4")],
        [View!(class = "flex flex-col gap-4")],
    );

    let use_case = UseCase!(
        name = "Send message and save to db",
        run = steps!(
            [generate_text = "asdasdasd asdasd"],
            [delv = slack::SendMessage::builder()
                .channel("#general")
                .message(generate_text)
                .build()],
            [DB::builder().update("messages").set(name)],
        )
    );

    Response::from_json(&use_case.name)
}
