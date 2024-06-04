# ptcgl-third-server-loader

PTCGL third-party server loader, used to manage and connect to third-party PTCGL servers.

## Build

Build this project you will need [Node.js](https://nodejs.org/), [.NET Core 2.0](https://dotnet.microsoft.com/en-us/download/dotnet/2.0) and [.NET Framework 4.5.2](https://dotnet.microsoft.com/en-us/download/dotnet-framework/net452).

1. Clone this repository: `git clone https://github.com/Hill-98/ptcgl-third-server-loader.git`
2. Install npm dependencies: `yarn install`
3. Build DLLs and put in the `resources/external/dll` directory.
   * [Hastwell/Rainier.NativeOmukadeConnector](https://github.com/Hastwell/Rainier.NativeOmukadeConnector)
   * [Hill-98/AssemblyNamePatcher](https://github.com/Hill-98/AssemblyNamePatcher)
   * [Hill-98/PTCGLThirdServerLoaderExtension](https://github.com/Hill-98/PTCGLThirdServerLoaderExtension)
4. If you are building for Windows, you will also need to build [Hill-98/NeuExt.PTCGLUtility](https://github.com/Hill-98/NeuExt.PTCGLUtility) and put in the `bin` directory.
5. You can also choose to set background image for the main window, just name the image `main.webp` and put in `resources/external/background`.
6. Run dist script: `yarn run dist-macos-x64` or `yarn run dist-win32-x64`
7. You can find the built files in the `dist` directory.

## Download

You can download the pre-built version here: <https://pan.quark.cn/s/d19eac714e4d>

**Note: Pre-built versions contain some code that is not open source.**

## Localization

* Simplified Chinese (简体中文)

## Copyright

Pokémon is a trademark of The Pokémon Company (Pokémon), Nintendo, Game Freak and Creatures

Pokémon Trading Card Game is copyrighted by The Pokémon Company (Pokémon), Nintendo, Game Freak and Creatures

<a href="https://www.flaticon.com/free-icons/card-game" title="Card game icons">Card game icons created by mangsaabguru - Flaticon</a>

## Thanks

[Hastwell/Omukade.Cheyenne](https://github.com/Hastwell/Omukade.Cheyenne)

[Hastwell/Rainier.NativeOmukadeConnector](https://github.com/Hastwell/Rainier.NativeOmukadeConnector)
