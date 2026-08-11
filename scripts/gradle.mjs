// ============================================================
// Chama o wrapper do Gradle do projeto Android, nos dois shells que o npm
// usa (cmd.exe no Windows, sh no resto).
//
// O script antigo era `cd android && gradlew ...`, que dependia do cmd
// procurar executáveis no diretório atual. O Windows desliga essa busca
// quando NoDefaultCurrentDirectoryInExePath=1 está no ambiente — e aí o
// build morria com "'gradlew' não é reconhecido" mesmo com o arquivo no
// lugar. Aqui o caminho do wrapper é explícito: não há busca nenhuma.
//
// De quebra, preenche JAVA_HOME e ANDROID_HOME quando faltam, apontando
// para o JDK e o SDK que o Android Studio instala. Sem isso o Gradle para
// com "JAVA_HOME is not set" ou "SDK location not found" — o que não é erro
// do projeto, mas parece.
// ============================================================

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID_DIR = join(ROOT, 'android');
const isWindows = process.platform === 'win32';

const wrapper = join(ANDROID_DIR, isWindows ? 'gradlew.bat' : 'gradlew');
if (!existsSync(wrapper)) {
  console.error(`✖ Wrapper do Gradle não encontrado em ${wrapper}`);
  process.exit(1);
}

const tasks = process.argv.slice(2);
if (tasks.length === 0) {
  console.error('✖ Informe ao menos uma tarefa (ex.: node scripts/gradle.mjs assembleDebug)');
  process.exit(1);
}

const firstExisting = (paths) => paths.filter(Boolean).find((p) => existsSync(p));

const JDK_CANDIDATES = {
  win32: [
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    join(process.env.LOCALAPPDATA || '', 'Programs', 'Android Studio', 'jbr')
  ],
  darwin: ['/Applications/Android Studio.app/Contents/jbr/Contents/Home'],
  linux: ['/opt/android-studio/jbr', join(homedir(), 'android-studio', 'jbr')]
};

const SDK_CANDIDATES = {
  win32: [join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')],
  darwin: [join(homedir(), 'Library', 'Android', 'sdk')],
  linux: [join(homedir(), 'Android', 'Sdk')]
};

const env = { ...process.env };

// local.properties, quando existe, já diz ao Gradle onde está o SDK —
// nesse caso não mexemos em ANDROID_HOME para não brigar com a escolha
// que o Android Studio gravou ali.
const hasLocalProperties = existsSync(join(ANDROID_DIR, 'local.properties'));

const JAVA_EXE = isWindows ? 'java.exe' : 'java';

/**
 * Devolve a raiz do JDK, ou null se o caminho não servir.
 *
 * Não basta checar se JAVA_HOME está definida: uma variável definida com lixo
 * é pior que ausente, porque o Gradle a usa e falha com uma mensagem que não
 * aponta para a causa. Dois casos reais tratados aqui — um caractere perdido
 * no fim (um `>` de prompt copiado junto, por exemplo) e o caminho apontando
 * para .../bin em vez da raiz do JDK.
 */
function normalizeJavaHome(dir) {
  if (!dir) return null;
  const trimmed = dir.trim();
  if (existsSync(join(trimmed, 'bin', JAVA_EXE))) return trimmed;
  if (existsSync(join(trimmed, JAVA_EXE))) return dirname(trimmed);
  return null;
}

const declaredJavaHome = env.JAVA_HOME;
let javaHome = normalizeJavaHome(declaredJavaHome);

if (declaredJavaHome && !javaHome) {
  console.warn(`⚠ JAVA_HOME inválido no ambiente: ${JSON.stringify(declaredJavaHome)}`);
  console.warn('  Nenhum java executável nesse caminho. Ignorando e procurando o JDK do Android Studio.');
  console.warn('  Vale corrigir a variável no Windows — ela também afeta outras ferramentas.');
}

if (!javaHome) {
  javaHome = normalizeJavaHome(firstExisting(JDK_CANDIDATES[process.platform] || []));
  if (javaHome) {
    console.log(`ℹ Usando o JDK do Android Studio: ${javaHome}`);
  } else {
    console.error('✖ Nenhum JDK utilizável encontrado.');
    console.error('  Instale o Android Studio ou defina JAVA_HOME apontando para a RAIZ do JDK.');
    process.exit(1);
  }
}

env.JAVA_HOME = javaHome;

if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT && !hasLocalProperties) {
  const sdk = firstExisting(SDK_CANDIDATES[process.platform] || []);
  if (sdk) {
    env.ANDROID_HOME = sdk;
    env.ANDROID_SDK_ROOT = sdk;
    console.log(`ℹ ANDROID_HOME não estava definido; usando o SDK: ${sdk}`);
  } else {
    console.error('✖ SDK do Android não encontrado. Defina ANDROID_HOME ou crie');
    console.error('  android/local.properties com sdk.dir=/caminho/do/sdk');
    process.exit(1);
  }
}

// -p evita depender do diretório de trabalho do shell que chamou o script.
const args = ['-p', ANDROID_DIR, ...tasks];

// No Windows o Node exige shell para rodar .bat (mitigação da CVE-2024-27980).
// Passar argv separado junto com shell:true é depreciado (DEP0190) e deixa a
// citação por conta do Node, então montamos a linha de comando aqui, com tudo
// entre aspas. Fora do Windows não há shell no meio e argv vai direto.
const result = isWindows
  ? spawnSync([wrapper, ...args].map((a) => `"${a}"`).join(' '), {
      stdio: 'inherit',
      env,
      shell: true
    })
  : spawnSync(wrapper, args, { stdio: 'inherit', env });

if (result.error) {
  console.error(`✖ Falha ao executar o Gradle: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
