load(":actions.bzl", "run_local_shell")

def _check_sources(ctx):
    for f in ctx.files.srcs:
        if not f.is_source:
            fail("Only source files are allowed in srcs. Provide rule producing {} in deps instead!".format(f.basename))

def _local_action(ctx):
    _check_sources(ctx)

    declare = ctx.actions.declare_file
    if ctx.attr.dir:
        declare = ctx.actions.declare_directory

    outs = [declare(o) for o in ctx.attr.outs]

    run_local_shell(
        ctx,
        inputs = ctx.files.srcs + ctx.files.deps + ctx.files.tools,
        outputs = outs,
        command = ctx.attr.cmd,
        tools = ctx.attr.tools,
        progress_message = "Running local action '{}'".format(ctx.label),
    )

    return [DefaultInfo(files = depset(outs))]

local_action = rule(
    doc = """Runs provided command in the source directory of this package.

    This rule is used to escape the strict Bazel's requirement of producing outputs into a separate tree.
    Because of this, this rule always runs locally and with no sandbox.
    The outputs that are declared by this rule will be symlinked to the path that Bazel will be happy with.

    USE WITH CAUTION!
    """,
    implementation = _local_action,
    attrs = {
        "srcs": attr.label_list(
            doc = "Source files that affect this rule.",
            allow_empty = True,
            allow_files = True,
            mandatory = True,
        ),
        "outs": attr.string_list(
            doc = """Outputs produced by the rule. These directores are expected to be produced in the source tree and will be symlinked to where Bazel expects them to be.""",
            mandatory = True,
        ),
        "dir": attr.bool(
            doc = "Wether declared outputs are directories.",
            default = False,
        ),
        "cmd": attr.string(
            doc = "Command to be executed during the build. It must produce declared outputs.",
            mandatory = True,
        ),
        "deps": attr.label_list(
            doc = "Labels for rules that must build before this rule.",
            allow_files = False,
        ),
        # TODO: fix cfg = "exec".
        "tools": attr.label_list(
            doc = "Tools with their names that will be made available to the rule environment.",
        ),
        "_workspace": attr.label(
            doc = "Implicit dependency on the WORKSPACE file.",
            allow_single_file = True,
            default = "//:WORKSPACE",
        ),
    },
)

def _executable(ctx):
    _check_sources(ctx)

    if ctx.attr.out == "":
        name = ctx.attr.name
    else:
        name = ctx.attr.out
    output = ctx.actions.declare_file(name)

    run_local_shell(
        ctx,
        inputs = ctx.files.srcs + ctx.files.deps + ctx.files.tools,
        outputs = [output],
        progress_message = "Building executable '{}'".format(ctx.label),
        tools = ctx.attr.tools,
        command = ctx.attr.cmd,
    )

    return DefaultInfo(executable = output)

executable = rule(
    implementation = _executable,
    attrs = {
        "srcs": attr.label_list(
            doc = "Source files that affect this rule.",
            allow_files = True,
            mandatory = True,
        ),
        "deps": attr.label_list(
            doc = "Labels for rules that must build before this rule.",
            allow_files = False,
        ),
        "cmd": attr.string(
            doc = "Command to be executed during the build. It must produce declared outputs.",
            mandatory = True,
        ),
        "tools": attr.label_list(
            doc = "Tools with their names that will be made available to the rule environment.",
        ),
        "out": attr.string(
            doc = "Override default out name.",
            default = "",
        ),
        "_workspace": attr.label(
            doc = "Implicit dependency on the WORKSPACE file.",
            allow_single_file = True,
            default = "//:WORKSPACE",
        ),
    },
    executable = True,
)

def go_tool(name, go_pkg, **kwargs):
    """Build a Go tool using existing Go toolchain. The executable can then be passed as a tool for other rules.

    The tool must exist in the root go.mod file. You can force go mod to require it by using blank imports in some file,
    if there's no direct require in your code.
    """
    executable(
        name = name,
        srcs = [
            "//:go.mod",
            "//:go.sum",
        ],
        cmd = """
cd $SOURCE_ROOT_DIR
mkdir -p bin
go build -o $TARGET_OUT_DIR/{name} {go_pkg}
""".format(name = name, go_pkg = go_pkg),
        **kwargs
    )

def _macos_application(ctx):
    out = ctx.actions.declare_directory(ctx.attr.out)

    lines = []

    for k, v in ctx.attr.contents.items():
        lines.append("mkdir -p $TARGET_OUT_DIR/{}/Contents/{}".format(ctx.attr.out, v))
        for f in k.files.to_list():
            lines.append("cp -R $SOURCE_ROOT_DIR/{} $TARGET_OUT_DIR/{}/Contents/{}".format(f.path, ctx.attr.out, v))

    run_local_shell(
        ctx,
        inputs = ctx.files.contents,
        outputs = [out],
        command = "\n".join(lines),
        progress_message = "Running macos_application action '{}'".format(ctx.label),
    )

    return [DefaultInfo(files = depset([out]))]

macos_application = rule(
    implementation = _macos_application,
    attrs = {
        "out": attr.string(
            doc = "Name of the output (including .app extension)",
            mandatory = True,
        ),
        "contents": attr.label_keyed_string_dict(
            doc = "Things to copy inside the bundle.",
            mandatory = True,
            allow_files = True,
        ),
        "tools": attr.label_list(
            doc = "Tools with their names that will be made available to the rule environment.",
        ),
    },
)
