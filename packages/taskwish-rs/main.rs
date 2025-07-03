use anymap::AnyMap;

macro_rules! steps {
    ($use_case:ident, $( $name:ident : $ret:ty => $func:expr ),* $(,)?) => {
        $(
            #[allow(dead_code)]
            struct $name {
                value: $ret,
            }

            #[allow(dead_code)]
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

            $use_case.insert($name::new(&$use_case));
        )*
    };
}

fn main() {
    let mut use_case = AnyMap::new();

    steps!(use_case,
        HelloWorld: String => |_scope | "Hello, Bersen!".to_string(),

        AgeStep: String => |scope: &AnyMap| {
           let step = scope.get::<HelloWorld>().expect("Not found");

           step.value.to_string()
        },

        IsAdmin: bool => |_scope| true,
    );
}
