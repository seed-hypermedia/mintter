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
            allow_files = False,
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
            allow_files = False,
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
