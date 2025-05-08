import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { minify } from 'html-minifier-terser';

type PathConfig = {
    src: string;
    output: string;
};

type AssetPaths = {
    background: { src: string; dest: string };
    logo: { src: string; dest: string };
    html: { src: string; dest: string };
    css: { src: string };
    js: { src: string };
};

type FaviconConfig = {
    sizes: number[];
    appleIconSize: number;
    manifestIcons: Array<{ size: number; type: string }>;
    themeColor: string;
    backgroundColor: string;
};

type MinifyOptions = {
    collapseWhitespace: boolean;
    removeComments: boolean;
    removeOptionalTags: boolean;
    removeRedundantAttributes: boolean;
    removeScriptTypeAttributes: boolean;
    removeStyleLinkTypeAttributes: boolean;
    minifyCSS: boolean;
    minifyJS: boolean;
};

class WebsiteBuilder {
    private readonly paths: PathConfig;
    private readonly assets: AssetPaths;
    private readonly faviconConfig: FaviconConfig;
    private readonly minifyOptions: MinifyOptions;

    constructor() {
        this.paths = {
            src: path.join(__dirname, 'src'),
            output: __dirname // Output directly to repository root
        };

        this.assets = {
            background: {
                src: path.join(this.paths.src, 'background.png'),
                dest: path.join(this.paths.output, 'background.webp')
            },
            logo: {
                src: path.join(this.paths.src, 'logo.png'),
                dest: path.join(this.paths.output, 'logo.svg')
            },
            html: {
                src: path.join(this.paths.src, 'index.html'),
                dest: path.join(this.paths.output, 'index.html')
            },
            css: { src: path.join(this.paths.src, 'styles.css') },
            js: { src: path.join(this.paths.src, 'scripts.js') }
        };

        this.faviconConfig = {
            sizes: [16, 32, 48, 96, 144, 192, 512],
            appleIconSize: 180,
            manifestIcons: [
                { size: 192, type: 'image/png' },
                { size: 512, type: 'image/png' }
            ],
            themeColor: '#0a192f',
            backgroundColor: '#0a192f'
        };

        this.minifyOptions = {
            collapseWhitespace: true,
            removeComments: true,
            removeOptionalTags: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            minifyCSS: true,
            minifyJS: true
        };
    }

    async build(): Promise<void> {
        try {
            // No need to create output directory as we're using the root

            await Promise.all([
                this.optimizeBackground(),
                this.processLogo()
            ]);

            await this.processHtml();

            console.log('Build completed successfully!');
        } catch (error) {
            console.error('Build failed:', error);
        }
    }

    private async optimizeBackground(): Promise<void> {
        try {
            await sharp(this.assets.background.src)
                .webp({ quality: 80 })
                .toFile(this.assets.background.dest);

            console.log('Background image optimized and saved as webp');
        } catch (error) {
            console.error('Error optimizing background:', error);
            throw error;
        }
    }

    private async processLogo(): Promise<void> {
        try {
            await this.convertLogoToSvg();

            await this.generateFavicons();
        } catch (error) {
            console.error('Error processing logo:', error);
            throw error;
        }
    }

    private async convertLogoToSvg(): Promise<void> {
        try {
            const metadata = await sharp(this.assets.logo.src).metadata();
            const { width, height } = metadata;

            const svgData = await sharp(this.assets.logo.src)
                .png({ quality: 100 })
                .toBuffer();

            const svgContent = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <image href="data:image/png;base64,${svgData.toString('base64')}" />
      </svg>`;

            await fs.writeFile(this.assets.logo.dest, svgContent);
            console.log('Logo converted to SVG');
        } catch (error) {
            console.error('Error converting logo to SVG:', error);
            throw error;
        }
    }

    private async generateFavicons(): Promise<void> {
        try {
            await Promise.all(
                this.faviconConfig.sizes.map(size => this.generateFaviconSize(size))
            );

            await sharp(this.assets.logo.src)
                .resize(32, 32)
                .toFile(path.join(this.paths.output, 'favicon.ico'));
            console.log('Generated favicon.ico');

            await sharp(this.assets.logo.src)
                .resize(this.faviconConfig.appleIconSize, this.faviconConfig.appleIconSize)
                .png()
                .toFile(path.join(this.paths.output, 'apple-touch-icon.png'));
            console.log('Generated apple-touch-icon.png');

            await this.generateWebManifest();
        } catch (error) {
            console.error('Error generating favicons:', error);
            throw error;
        }
    }

    private async generateFaviconSize(size: number): Promise<void> {
        await sharp(this.assets.logo.src)
            .resize(size, size)
            .png()
            .toFile(path.join(this.paths.output, `favicon-${size}x${size}.png`));

        console.log(`Generated favicon-${size}x${size}.png`);
    }

    private async generateWebManifest(): Promise<void> {
        const manifest = {
            name: 'Panopsis',
            short_name: 'Panopsis',
            icons: this.faviconConfig.manifestIcons.map(icon => ({
                src: `/favicon-${icon.size}x${icon.size}.png`,
                sizes: `${icon.size}x${icon.size}`,
                type: icon.type
            })),
            theme_color: this.faviconConfig.themeColor,
            background_color: this.faviconConfig.backgroundColor,
            display: 'standalone'
        };

        await fs.writeFile(
            path.join(this.paths.output, 'site.webmanifest'),
            JSON.stringify(manifest, null, 2)
        );

        console.log('Generated site.webmanifest');
    }

    private async processHtml(): Promise<void> {
        try {
            const [htmlContent, cssContent, jsContent] = await Promise.all([
                fs.readFile(this.assets.html.src, 'utf8'),
                fs.readFile(this.assets.css.src, 'utf8'),
                fs.readFile(this.assets.js.src, 'utf8')
            ]);

            let processedHtml = htmlContent
                .replace(
                    '<link rel="stylesheet" href="styles.css">',
                    `<style>${cssContent}</style>`
                )
                .replace(
                    '<script src="scripts.js"></script>',
                    `<script>${jsContent}</script>`
                );

            const minifiedHtml = await minify(processedHtml, this.minifyOptions);

            await fs.writeFile(this.assets.html.dest, minifiedHtml);

            console.log('HTML processed and optimized with inlined CSS and JS');
        } catch (error) {
            console.error('Error processing HTML:', error);
            throw error;
        }
    }
}

const builder = new WebsiteBuilder();
builder.build().catch(error => {
    console.error('Build process failed:', error);
    process.exit(1);
});