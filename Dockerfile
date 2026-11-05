FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS release
COPY --from=install /app/node_modules node_modules
COPY . .
RUN bun run build
USER bun
EXPOSE 3000/tcp
CMD [ "bun", "server.ts" ]