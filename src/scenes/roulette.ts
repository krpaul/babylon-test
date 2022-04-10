import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { AmmoJSPlugin } from "@babylonjs/core/Physics/Plugins/ammoJSPlugin";
import "@babylonjs/core/Physics/physicsEngineComponent";

// If you don't need the standard material you will still need to import it since the scene requires it.
import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { ammoModule, ammoReadyPromise } from "../externals/ammo";
// import { cannonModule, cannonReadyPromise } from "../externals/cannon";
import { CreateSceneClass } from "../createScene";

import * as BABYLON from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { double } from "@babylonjs/core";

// required imports
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import rouletteTableModel from '../../assets/glb/Roulette_Table_V5.glb'
import roomEnvironment from "../../assets/environment/room.env"

class Roulette implements CreateSceneClass {
    preTasks = [ammoReadyPromise];

    createScene = async (engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new Scene(engine);

        const plugin = new AmmoJSPlugin(true, ammoModule)
        scene.enablePhysics(null, plugin);
        scene.getPhysicsEngine()?.setSubTimeStep(5);

        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera("my first camera", 0, Math.PI / 3, 10, new Vector3(0, 0, 0), scene);

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        new BABYLON.EnvironmentHelper({
            skyboxTexture: roomEnvironment,
            createGround: false
        }, scene)

        const fixedMeshNames = [
            "Circle.001",
            "Circle.002",
            "Circle.003",
            "Circle.004",
            "Diamond",
            "Diamond.001",
            "Diamond.002",
            "Diamond.003",
            "Diamond.004",
            "Diamond.005",
            "Diamond.006",
            "Diamond.007",
            "InnerPillar",
            "OuterCircle"
        ]

        const movingMeshNames = [
            "numbers",
            "Seperator",
            "InnerCircle"
        ]

        // load the roulette table
        const result1 = await SceneLoader.ImportMeshAsync(
            fixedMeshNames,
            "",
            rouletteTableModel,
            scene,
            undefined,
            ".glb"
        )

        const fixedMeshes = result1.meshes
        fixedMeshes[0].setParent(null)

        // load the roulette table
        // let movingMeshes: AbstractMesh[]; 
        const result2 = await SceneLoader.ImportMeshAsync(
            movingMeshNames,
            "",
            rouletteTableModel,
            scene,
            undefined,
            ".glb"
        )

        const movingMeshes = result2.meshes
        movingMeshes[0].setParent(null)

        fixedMeshes.forEach((m) => {
            m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {
                mass: 0, friction: 0.45
            }, scene)
        })

        const numbersMesh = scene.getMeshByName("numbers"),
            seperatorsMesh = scene.getMeshByName("Seperator");

        if (!numbersMesh || !seperatorsMesh) {
            throw new Error("Could not find numbers or seperators mesh")
        }

        let numberVerticesRaw: Vector3[] = [];
        let numberVertices: Vector3[] = [];
        let groupedVertices: Vector3[][] = [];
        let shuffledGroupedVertices: Vector3[][] = []

        const defaultNumberRotation = new BABYLON.Quaternion(0, 1, 0, 0);

        (movingMeshes[0] as any).physicsImposter = new BABYLON.PhysicsImpostor(movingMeshes[0], BABYLON.PhysicsImpostor.MeshImpostor, {
            mass: 0, friction: 0.45, restitution: 0
        }, scene)

        const calculateVertices = () => {
            movingMeshes[0].rotationQuaternion = defaultNumberRotation.clone()

            const v = numbersMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
            if (v == null) throw new Error("no vertices");

            numberVerticesRaw = [];
            numberVertices = [];
            groupedVertices = [];
            shuffledGroupedVertices = [];

            for (let i = 0; i < v.length; i += 3) {
                numberVerticesRaw.push(
                    Vector3.FromArray(v, i)
                )
            }

            // filter out duplicate vertices
            for (let i = 0; i < numberVerticesRaw.length; i++) {
                const v = numberVerticesRaw[i]

                let includes = false;
                for (const vert in numberVertices) {
                    if (v.equals(numberVertices[vert])) {
                        includes = true;
                        break;
                    }
                }

                if (!includes) {
                    numberVertices.push(v)
                }
            }

            // group the vertices into groups of 2
            for (let i = 0; i < numberVertices.length - 1; i += 2) {
                groupedVertices.push([
                    numberVertices[i],
                    numberVertices[i + 1]
                ])
            }

            // sort
            groupedVertices.sort((a, b) => {
                return a[0].x - b[0].x
            })

            // reaarrange the grouped verticies like a shuffle
            for (let i = 0; i < groupedVertices.length; i += 2) shuffledGroupedVertices.push(groupedVertices[i])
            for (let i = groupedVertices.length - 2; i > 0; i -= 2) shuffledGroupedVertices.push(groupedVertices[i])
        }

        calculateVertices()

        // rotates vertices around the origin by given radians
        const rotateVerticies = (angleRad: double) => {
            angleRad %= Math.PI * 2

            for (let i = 0; i < shuffledGroupedVertices.length; i++) {
                for (let j = 0; j < shuffledGroupedVertices[i].length; j++) {
                    const v = shuffledGroupedVertices[i][j]
                    const newV = v.clone()

                    const newAngle = Math.atan2(newV.z, newV.x) + angleRad;
                    const distance = Math.sqrt(newV.x ** 2 + newV.z ** 2);

                    newV.x = distance * Math.cos(newAngle);
                    newV.z = distance * Math.sin(newAngle);

                    shuffledGroupedVertices[i][j] = newV
                }
            }
        }

        const rotateVerticies2 = (quat: BABYLON.Quaternion) => {
            for (let i = 0; i < shuffledGroupedVertices.length; i++) {
                for (let j = 0; j < shuffledGroupedVertices[i].length; j++) {
                    const v = shuffledGroupedVertices[i][j]
                    v.rotateByQuaternionToRef(quat, shuffledGroupedVertices[i][j])
                }
            }
        }

        // create 37 colors in rainbow order
        const colors = [new BABYLON.Color4(0, 1, 0, 1), new BABYLON.Color4(0, 0.5, 0.5, 1)]
        for (let i = 0; i < 34; i++) colors.push(new BABYLON.Color4(1, i * 6 / 255, 0, 1))
        colors.push(new BABYLON.Color4(0, 0, 1, 1))

        // create lines 
        const lines: BABYLON.LinesMesh[] = [];
        const drawDebugLines = (noclear = false) => {
            if (!noclear) lines.forEach((l) => {
                l.dispose()
            })

            for (let i = 0; i < lines.length; i++) {
                delete lines[i];
            }

            for (let i = 0; i < shuffledGroupedVertices.length - 1; i++) {
                const v = shuffledGroupedVertices[i].map((vect: any): Vector3 => { return vect.clone() })
                const v1 = shuffledGroupedVertices[i + 1].map((vect: any): Vector3 => { return vect.clone() })

                v[0].y += 2
                v[1].y += 2
                v1[0].y += 2
                v1[1].y += 2

                lines.push(BABYLON.MeshBuilder.CreateLines("line", {
                    points: [...v, ...v1],
                    updatable: false,
                    colors: [colors[i], colors[i], colors[i], colors[i]]
                }, scene))
            }
        }

        const drawSeperatorMeshBounds = () => {
            const v = seperatorsMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)!
            const verticiesRaw: Vector3[] = [];

            for (let i = 0; i < v.length; i += 3) {
                verticiesRaw.push(
                    Vector3.FromArray(v, i)
                )
            }

            for (let j = 0; j < verticiesRaw.length; j++) {
                BABYLON.MeshBuilder.CreateLines("line", {
                    points: [
                        verticiesRaw[j],
                        verticiesRaw[j].clone().add(new BABYLON.Vector3(0, 2, 0))
                    ],
                    updatable: false,
                    colors: [new BABYLON.Color4(1, 0, 0, 1), new BABYLON.Color4(1, 0, 0, 1)]
                }, scene)
            }
        }

        // invisible barrier so that ball doesn't fly away to narnia
        const barrier = BABYLON.MeshBuilder.CreateBox("barrier", {
            height: 0.01,
            width: 6,
            depth: 6,

        }, scene);

        // add collider
        barrier.physicsImpostor = new BABYLON.PhysicsImpostor(barrier, BABYLON.PhysicsImpostor.BoxImpostor, {
            mass: 0,
        }, scene);

        // set material to invisible
        barrier.material = new BABYLON.StandardMaterial("barrier", scene);
        barrier.material.alpha = 0;

        // set pos
        barrier.position.y = 0.4;

        // Our built-in 'sphere' shape.
        const ball = BABYLON.MeshBuilder.CreateSphere(
            "ball",
            { diameter: 0.14, segments: 10 },
            scene
        );

        ball.physicsImpostor = new PhysicsImpostor(ball, PhysicsImpostor.SphereImpostor, {
            mass: 20,
            restitution: 0,
        }, scene);

        ball.material = this.ballMaterial(scene)
        ball.actionManager = new BABYLON.ActionManager(scene);

        // weirdly we need to use Ammo.js itself to set restitution
        plugin.setBodyRestitution(ball.physicsImpostor, 0)

        const ballStart = new Vector3(2, 0.3, 0)
        const startAngularSpinSpeed: double = 0.03; // radians per frame
        const angularSpinFriction: double = 0.00001 // - radians per frame per frame
        let currFriction: double = 0;

        // Move the sphere 
        ball.position = ballStart;

        let spin = false;
        let launchBall = false;
        let checkResult = false;

        const reset = () => {
            calculateVertices()

            ball.position = ballStart;
            ball.physicsImpostor?.setAngularVelocity(Vector3.Zero());
            ball.physicsImpostor?.setLinearVelocity(
                new Vector3(0, ballStart.y, 0)
            );

            spin = true
            launchBall = true;
            currFriction = 0;
            checkResult = false;
            landed = false;

            movingMeshes[0].rotationQuaternion = defaultNumberRotation.clone();
        }

        document.getElementById("reset")?.addEventListener("click", reset)

        const strength = ball.physicsImpostor.mass * 5;
        let forceEndpoint: Array<number> = [];
        const applyCircularForce = () => {
            const { x, z } = ball.position;
            const rise = Math.abs(x * strength);
            const run = Math.abs(z * strength);

            if (x >= 0 && z >= 0) { // quadrant 1
                forceEndpoint = [x + run, z - rise]
            } else if (x < 0 && z > 0) { // quadrant 2
                forceEndpoint = [x + run, z + rise]
            }
            else if (x < 0 && z < 0) { // quadrant 3
                forceEndpoint = [x - run, z + rise]
            }
            else if (x > 0 && z < 0) { // quadrant 4
                forceEndpoint = [x - run, z - rise]
            }

            ball.physicsImpostor?.applyForce(
                new Vector3(forceEndpoint[0], -10, forceEndpoint[1]),
                ball.position
            )
        }

        let launchStopFrameCount = 0
        const stopFrame = 300;

        const mapping = [
            [36, 'red'], [13, 'black'], [27, 'red'], [6, 'black'], [34, 'red'], [17, 'black'], [25, 'red'], [2, 'black'], [21, 'red'], [4, 'black'], [19, 'red'], [15, 'black'], [32, 'red'], [0, 'green'], [26, 'black'], [3, 'red'], [35, 'black'], [12, 'red'], [28, 'black'], [7, 'red'], [29, 'black'], [18, 'red'], [22, 'black'], [9, 'red'], [31, 'black'], [14, 'red'], [20, 'black'], [1, 'red'], [33, 'black'], [16, 'red'], [24, 'black'], [5, 'red'], [10, 'black'], [23, 'red'], [8, 'black'], [30, 'red'], [11, 'black'],
        ]

        let landed = false;
        const checkBallLanded = (): void => {
            if (ball.intersectsMesh(numbersMesh, false, true)) {
                landed = true
                ball.physicsImpostor?.setLinearVelocity(Vector3.Zero());
                ball.physicsImpostor?.setAngularVelocity(Vector3.Zero());
            }
        }

        scene.registerAfterRender(() => {
            if (spin) {
                const angle = -(startAngularSpinSpeed - currFriction) * scene.getAnimationRatio()
                if (Math.abs(angle) >= 0.002) {
                    movingMeshes[0].rotate(BABYLON.Axis.Y, angle, BABYLON.Space.LOCAL);

                    const quat = BABYLON.Quaternion.FromEulerAngles(0, angle, 0)
                    rotateVerticies2(quat)

                    if (landed) {
                        ball.position = ball.position.rotateByQuaternionAroundPointToRef(
                            quat, Vector3.Zero(), ball.position
                        )
                    }
                }
            }

            checkBallLanded()

            if (checkResult && landed) {
                if (ball.physicsImpostor?.getLinearVelocity()?.floor().equals(Vector3.Zero())) {
                    for (let i = 0; i < shuffledGroupedVertices.length - 1; i++) {
                        const vertices = [...shuffledGroupedVertices[i], ...shuffledGroupedVertices[i + 1]];
                        const Xs = vertices.map((vect: any): number => { return vect.x })
                        const Zs = vertices.map((vect: any): number => { return vect.z })
                        if (
                            ball.position.x >= Math.min(...Xs) &&
                            ball.position.x <= Math.max(...Xs) &&
                            ball.position.z >= Math.min(...Zs) &&
                            ball.position.z <= Math.max(...Zs)

                        ) {
                            const m: any = mapping[i];
                            document.getElementById("l")!.innerHTML += `
                                <h2 style="color: ${m[1]}">${m[0]}</h2>
                            `
                            checkResult = false;
                            landed = false;

                            reset()
                            break;
                        }
                    }
                }
            }

            // stop the spinning of the table if friction has stopped it
            if (currFriction >= startAngularSpinSpeed && spin) {
                spin = false;
                checkResult = true;
            }
            // otherwise keep spinning and applying friction
            else if (spin)
                currFriction += angularSpinFriction;

            // if the ball is getting launched, apply a circular force
            if (launchBall && launchStopFrameCount < stopFrame) {
                applyCircularForce();
                launchStopFrameCount++;
            } else {
                launchBall = false;
                launchStopFrameCount = 0;
            }
        })

        return scene;
    };

    randomMat = (scene_: Scene, i: number): BABYLON.StandardMaterial => {
        const acryl_mat = new BABYLON.StandardMaterial("acryl_" + i, scene_);

        acryl_mat.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
        acryl_mat.specularColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
        acryl_mat.emissiveColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
        acryl_mat.ambientColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());

        return acryl_mat
    }

    ballMaterial = (scene_: Scene): BABYLON.StandardMaterial => {
        const acryl_mat = new BABYLON.StandardMaterial("acryl", scene_);

        acryl_mat.diffuseColor = new BABYLON.Color3(1, 0, 1);
        acryl_mat.specularColor = new BABYLON.Color3(0.5, 0.6, 0.87);
        acryl_mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        acryl_mat.ambientColor = new BABYLON.Color3(0.23, 0.98, 0.53);

        return acryl_mat
    }

    getSlope = (x1: number, y1: number, x2: number, y2: number): number => {
        const rise = y2 - y1;
        const run = x2 - x1;
        return rise / run;
    }
}

export default new Roulette();
