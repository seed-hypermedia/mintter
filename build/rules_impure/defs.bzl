load("@aspect_bazel_lib//lib:repo_utils.bzl", "repo_utils")

def _tool_impl(rctx):
    bin = rctx.attr.binary
    if not bin:
        bin = rctx.name

    if repo_utils.is_windows(rctx):
        print("DOING WINDOWS")
        return

    tool = rctx.which(bin)
    if not tool:
        fail("Couldn't find tool '{}'. Make sure it's in your PATH.".format(bin))
    tool = tool.realpath

    rctx.symlink(tool, bin)

    version = rctx.execute([tool, rctx.attr.version_command]).stdout.strip()
    want_version = rctx.attr.version_match
    if want_version not in version:
        fail("Bad version for the tool '{}': want = '{}', got = '{}'".format(bin, want_version, version))

    rctx.file("BUILD.bazel", """
exports_files(
    srcs = glob(["**"]),
    visibility = ["//visibility:public"],
)
""", executable = False)

tool = repository_rule(
    implementation = _tool_impl,
    attrs = {
        "binary": attr.string(),
        "version_command": attr.string(mandatory = True),
        "version_match": attr.string(mandatory = True),
    },
    local = True,
    environ = [
        "PATH",
        "HOME",
    ],
)
