{
    inputs = {
        nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    };

    outputs = { self, nixpkgs }: let
        pkgs = import nixpkgs { system = "x86_64-linux"; };
    in {
        devShells.x86_64-linux.default = pkgs.mkShell {
            packages = [
                # Keep in step with `packageManager` in package.json and the
                # Node version in .github/workflows/deploy.yml.
                pkgs.nodejs_24
                pkgs.pnpm
            ];
        };
    };
}
