import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { AmmoJSPlugin } from "@babylonjs/core/Physics/Plugins/ammoJSPlugin";
import "@babylonjs/core/Physics/physicsEngineComponent";
import * as CANNON from 'cannon'

// If you don't need the standard material you will still need to import it since the scene requires it.
import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { ammoModule, ammoReadyPromise } from "../externals/ammo";
import { cannonModule, cannonReadyPromise } from "../externals/cannon";
import { CreateSceneClass } from "../createScene";

import * as BABYLON from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';

// required imports
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import rouletteTableModel from '../../assets/glb/Roulette_Table.glb'
import roomEnvironment from "../../assets/environment/room.env"
import { CannonJSPlugin } from "@babylonjs/core";

class PhysicsSceneWithAmmo implements CreateSceneClass {
    preTasks = [cannonReadyPromise];

    createScene = async (engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new Scene(engine);
    
        scene.enablePhysics();
    
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

        new BABYLON.EnvironmentHelper( {
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
        // let movingMeshes: BABYLON.AbstractMesh[]; 
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
            m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {mass: 0, friction: 0.25}, scene)
        })

        movingMeshes.forEach((m) => {
            m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {mass: 0, friction: 0.25}, scene)
        })

        // fixedMeshes[0].physicsImpostor = new BABYLON.PhysicsImpostor(fixedMeshes[0], BABYLON.PhysicsImpostor.MeshImpostor, {mass: 0, friction: 0.25}, scene)
        // movingMeshes[0].physicsImpostor = new BABYLON.PhysicsImpostor(movingMeshes[0], BABYLON.PhysicsImpostor.MeshImpostor, {mass: 0, friction: 0.25}, scene)
        
        // meshes.slice(1).forEach(m => {
        //     m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {mass: 0, friction: 0.25}, scene)
        // })

        // Our built-in 'sphere' shape.

        const balls: BABYLON.Mesh[] = [];
        for (let i = 0; i < 100; i++){
            const ball = BABYLON.MeshBuilder.CreateSphere(
                "ball",
                { diameter: 0.14, segments: 10 },
                scene
            );
                
            ball.physicsImpostor = new PhysicsImpostor(ball, PhysicsImpostor.SphereImpostor, { mass: 2, restitution: 0.8}, scene);
            
            const acryl_mat = new BABYLON.StandardMaterial("acryl", scene);
            
            acryl_mat.diffuseColor = new BABYLON.Color3(1, 0, 1);
            acryl_mat.specularColor = new BABYLON.Color3(0.5, 0.6, 0.87);
            acryl_mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
            acryl_mat.ambientColor = new BABYLON.Color3(0.23, 0.98, 0.53);

            ball.material = acryl_mat
            
            // Move the sphere upward
            ball.position.y = 5
            ball.position.x = 1 + Math.random() / 100
            ball.position.z = Math.random() / 100

            balls.push(ball)
        }

        let destroyPaths = false;
        let frozen = false;
        
        const spawnNewBalls = () => {
            destroyPaths = true
            for (let i = 0; i < 100; i++){
                const ball = BABYLON.MeshBuilder.CreateSphere(
                    "ball",
                    { diameter: 0.14, segments: 10 },
                    scene
                );
                    
                ball.physicsImpostor = new PhysicsImpostor(ball, PhysicsImpostor.SphereImpostor, { mass: 2, restitution: 0.8}, scene);
                
                const acryl_mat = new BABYLON.StandardMaterial("acryl", scene);
                
                acryl_mat.diffuseColor = new BABYLON.Color3(1, 0, 1);
                acryl_mat.specularColor = new BABYLON.Color3(0.5, 0.6, 0.87);
                acryl_mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
                acryl_mat.ambientColor = new BABYLON.Color3(0.23, 0.98, 0.53);
    
                ball.material = acryl_mat
                
                // Move the sphere upward
                ball.position.y = 5
                ball.position.x = 1 + Math.random() / 100
                ball.position.z = Math.random() / 100
    
                balls.push(ball)
            }
            window.setTimeout(spawnNewBalls, 2000)
        } 

        window.setTimeout(spawnNewBalls, 2000)

        scene.registerAfterRender(() => {
            // if (frozen) return;
            let i = 0;
            balls.forEach(ball => {

                if (ball.position._y < -0.25 && ball.physicsImpostor)  // fallen thru
                {
                    ball.physicsImpostor.mass = 0
                } 
                else if (ball.physicsImpostor?.mass != 0 && !destroyPaths)  // draw paths
                {
                    ball.material = this.randomMat(scene, i);
                    const inst = ball.createInstance(`ball${i}_${ball.position}`)
                    inst.scaling = new BABYLON.Vector3(0.25, 0.25, 0.25);
                }
                // else if (destroyPaths && ball.physicsImpostor) {
                //     ball.physicsImpostor.mass = 0;
                //     frozen = true;
                // }

                i++;
            })
            movingMeshes[0].rotate(BABYLON.Axis.Y, Math.PI/100, BABYLON.Space.WORLD)
        })
    
        return scene;
    };

    randomMat = (scene_: Scene, i: number): BABYLON.StandardMaterial => {
            const acryl_mat = new BABYLON.StandardMaterial("acryl_"+i, scene_);
            
            acryl_mat.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
            acryl_mat.specularColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
            acryl_mat.emissiveColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
            acryl_mat.ambientColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());

            return acryl_mat
    }
}

export default new PhysicsSceneWithAmmo();
