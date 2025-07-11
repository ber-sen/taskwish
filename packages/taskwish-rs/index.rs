macro_rules! parse_items {
    ( $( $key:ident = $value:expr ),* $(,)? ) => {
        $(
            println!("Pair: {} = {:?}", stringify!($key), $value);
        )*
    };

    // mixed: recursively parse first item then the rest
    ( $first:ident = $val:expr, $( $rest:tt )* ) => {
        println!("Pair: {} = {:?}", stringify!($first), $val);
        parse_items!($( $rest )*);
    };

    ( $first:expr, $( $rest:tt )* ) => {
        println!("Just 2 value: {}", stringify!($first));
        parse_items!($( $rest )*);
    };

    () => {};
}

fn main() {
    parse_items!(3, 3,);
}
