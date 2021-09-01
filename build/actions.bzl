def _make_command(ctx, cmd, extra_lines = []):
    return """set -e
[ -z WORKSPACE ] && echo "Action must implicitly depend on the WORKSPACE file in order to resolve the root directory." && exit 1
export SOURCE_ROOT_DIR=$(dirname $(readlink WORKSPACE))
export EXECROOT="$(pwd)"
export ROOT_BUILD_DIR="$EXECROOT/{bin_dir_path}"
export RELATIVE_TARGET_DIR="$(dirname {bin_dir_path}/{build_file_path})"
export TARGET_OUT_DIR="$EXECROOT/$RELATIVE_TARGET_DIR"
{lines}
cd $(dirname $SOURCE_ROOT_DIR/{build_file_path})
{cmd}
""".format(
        cmd = cmd,
        lines = "\n".join(extra_lines),
        bin_dir_path = ctx.bin_dir.path,
        build_file_path = ctx.build_file_path,
    )

def run_local_shell(ctx, inputs, outputs, command, sandbox = False, **kwargs):
    """
    Runs shell action within the source directory of the Bazel package.

    Args:
        ctx: Rule's context.
        inputs: Inputs for the action.
        outputs: Outputs for the action.
        command: Script to run.
        tools: Tools for this action that will be made available as environment variables. Remember to specify tool files as inputs.
        sandbox: Wether to run the action in the sandbox.
        **kwargs: Other arguments accepted by run_shell action.
    """

    # To avoid problems we disable the cache for now since this can be very non-hermetic.
    reqs = {
        "no-cache": "1",
    }

    if not sandbox:
        reqs["no-sandbox"] = "1"
        reqs["local"] = "1"

    lines = []

    for t in ctx.attr.tools:
        # ctx.expand_location()
        # print(t.files_to_run.executable.basename)
        loc = ctx.expand_location("$(location {})".format(t.label))
        lines.append("export TOOL_{}=\"$EXECROOT/{}\"".format(t.files_to_run.executable.basename.upper().replace("-", "_"), loc))

    # Bazel pre-creates declared directory outputs, which makes the rule always succeed.
    # We don't want that so we remove predeclared directories with extra command lines.
    for o in outputs:
        if o.is_directory:
            lines.append("rm -rf {}".format(o.path))

    ctx.actions.run_shell(
        inputs = inputs,
        outputs = outputs,
        use_default_shell_env = True,
        execution_requirements = reqs,
        command = _make_command(ctx, command, lines),
    )
