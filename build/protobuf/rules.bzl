load("//build:actions.bzl", "run_local_shell")

def _proto_compile(ctx):
    inputs = ctx.files.srcs
    replaces = ctx.attr.replaces
    output_root = ctx.attr.output_root
    protoc_flags = ctx.attr.protoc_flags
    proto_root = ctx.attr.proto_root
    if not proto_root.endswith("/"):
        proto_root += "/"

    if not output_root.endswith("/"):
        output_root += "/"

    outs = []
    source_outs = []

    for i in inputs:
        if not i.basename.endswith(".proto"):
            fail("Only .proto files are allowed in srcs of '{}'".format(ctx.label))
        for r in replaces:
            replaced_filename = i.basename.replace(".proto", r)
            o = ctx.actions.declare_file(replaced_filename)
            outs.append(o)
            source_outs.append(o.short_path.replace(proto_root, output_root))
    proto_output_dir = output_root + ctx.label.package.replace(proto_root, "")

    files_to_clean = []
    for r in replaces:
        files_to_clean.append("{}/*{}".format(proto_output_dir, r))

    run_local_shell(
        ctx,
        inputs = inputs,
        outputs = outs,
        command = """
cd $SOURCE_ROOT_DIR
mkdir -p {output_dir}

rm -f {files_to_clean} || true

protoc -I {proto_root} {protoc_flags} {protos}

PWD="$(pwd)"
for o in {source_outs}; do
    ln -s $PWD/$o $TARGET_OUT_DIR/
done
""".format(
            proto_root = proto_root,
            files_to_clean = " ".join(files_to_clean),
            output_dir = proto_output_dir,
            protos = " ".join([s.short_path for s in inputs]),
            source_outs = " ".join(source_outs),
            protoc_flags = " ".join(protoc_flags),
        ),
    )

    return [DefaultInfo(files = depset(outs))]

proto_compile = rule(
    implementation = _proto_compile,
    attrs = {
        "srcs": attr.label_list(
            doc = "Proto sources.",
            allow_files = [".proto"],
            mandatory = True,
        ),
        "replaces": attr.string_list(
            doc = "List of replaces for .proto extension. For example .pb.go.",
            mandatory = True,
        ),
        "output_root": attr.string(
            doc = "Path from the root of the workspace to where generated code must be placed.",
            mandatory = True,
        ),
        "proto_root": attr.string(
            doc = "Root directory where proto files are stored.",
            mandatory = True,
        ),
        "protoc_flags": attr.string_list(
            doc = "List of flags for protoc.",
            mandatory = True,
        ),
        "_workspace": attr.label(
            doc = "Implicit dependency on the WORKSPACE file.",
            default = "//:WORKSPACE",
            allow_single_file = True,
        ),
        # TODO: pass in the protoc executable.
    },
)

def mtt_js_proto(name, srcs, visibility = ["//visibility:public"], **kwargs):
    """
    Macro for Mintter specific Protobuf compilation for JavaScript.
    """
    proto_compile(
        name = name,
        srcs = srcs,
        replaces = [".ts"],
        proto_root = "proto",
        output_root = "frontend/client/.generated/",
        protoc_flags = [
            "--plugin=`which protoc-gen-ts_proto`",
            "--ts_proto_opt=esModuleInterop=false",
            "--ts_proto_out=frontend/client/.generated/",
            "--ts_proto_opt=env=browser",
            "--ts_proto_opt=outputClientImpl=grpc-web",
            "--ts_proto_opt=lowerCaseServiceMethods=true",
            "--ts_proto_opt=addGrpcMetadata=true",
        ],
        visibility = visibility,
        **kwargs
    )

def mtt_go_proto(name, srcs, visibility = ["//visibility:public"], **kwargs):
    """
    Macro for Mintter specific Protobuf compilation for Go.
    """
    proto_compile(
        name = name,
        srcs = srcs,
        replaces = [".pb.go"],
        proto_root = "proto",
        output_root = "backend/api/",
        protoc_flags = ["--go_out=module=mintter,plugins=grpc:."],
        visibility = visibility,
        **kwargs
    )
